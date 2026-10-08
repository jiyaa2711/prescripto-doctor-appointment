// Auth, profile, doctors, appointments (double booking, ownership, status rules)
const { createSuite, createClient, login, nextWorkingDate } = require("./lib");

module.exports = async ({ baseUrl }) => {
    const { check, result } = createSuite("Auth, doctors & appointments");
    const call = createClient(baseUrl);
    const email = `patient${Date.now()}@test.com`;

    // ---- Auth ----
    let r = await call("POST", "/auth/register", { name: "Test Patient", email, password: "short" });
    check("register rejects short password", r.status === 400, r);
    r = await call("POST", "/auth/register", { name: "Test Patient", email, password: "password123", role: "admin" });
    check("register ok", r.status === 201 && r.body.token, r);
    check("register ignores role=admin sent by the frontend", r.body.user?.role === "patient", r.body.user);
    check("register does not return the password", !JSON.stringify(r.body).includes("password"), r.body);
    const patientToken = r.body.token;
    r = await call("POST", "/auth/register", { name: "X", email, password: "password123" });
    check("duplicate email -> 409", r.status === 409, r);
    r = await call("POST", "/auth/login", { email, password: "wrongpass1" });
    check("wrong password -> 401", r.status === 401, r);
    r = await call("POST", "/auth/login", { email: { $gt: "" }, password: "x" });
    check("NoSQL injection in login rejected", r.status === 400, r);
    r = await call("GET", "/auth/me", null, patientToken);
    check("GET /auth/me with token", r.status === 200 && r.body.user.email === email, r);
    r = await call("GET", "/auth/me", null, "bad.token.here");
    check("invalid token -> 401", r.status === 401, r);
    r = await call("GET", "/auth/me");
    check("no token -> 401", r.status === 401, r);

    const adminToken = await login(call, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    check("admin login", Boolean(adminToken));
    const doctorToken = await login(call, "richard.james@prescripto.test", process.env.SEED_DOCTOR_PASSWORD);
    check("doctor login", Boolean(doctorToken));

    // ---- Profile ----
    r = await call("PUT", "/users/profile", { phone: "9876543210", role: "admin", gender: "Male" }, patientToken);
    check("profile update ok", r.status === 200 && r.body.user.phone === "9876543210", r);
    check("profile update ignores role", r.body.user?.role === "patient", r.body.user);

    // ---- Doctors (public) ----
    r = await call("GET", "/doctors");
    check("GET /doctors returns the 15 seeded doctors", r.status === 200 && r.body.count === 15, r.body.count);
    check("public doctor list hides email/linked account", r.body.doctors.every((d) => !d.email && !d.user), r.body.doctors[0]);
    r = await call("GET", "/doctors?specialty=Dermatologist");
    check("filter by specialty", r.body.doctors.length === 2 && r.body.doctors.every((d) => d.specialty === "Dermatologist"), r.body);
    r = await call("GET", "/doctors?search=sarah");
    check("search by name", r.body.doctors.length === 1, r.body);
    r = await call("GET", "/doctors?search=.*");
    check("regex characters in search are escaped", r.status === 200 && r.body.count === 0, r.body.count);
    r = await call("GET", "/doctors?specialty=Astrologer");
    check("unknown specialty -> 400", r.status === 400, r);
    r = await call("GET", "/doctors/specialties");
    check("specialties list (8)", r.body.specialties?.length === 8, r.body);
    r = await call("GET", "/doctors/not-an-id");
    check("invalid ObjectId -> 400", r.status === 400, r);
    r = await call("GET", "/doctors/64b7f0000000000000000000");
    check("unknown doctor -> 404", r.status === 404, r);

    // ---- Doctor CRUD (admin only) ----
    r = await call("POST", "/doctors", { name: "Dr. Hacker", specialty: "Dermatologist", fees: 10 }, patientToken);
    check("patient cannot add doctor -> 403", r.status === 403, r);
    r = await call("POST", "/doctors", { name: "Dr. Hacker", specialty: "Dermatologist", fees: 10 });
    check("anonymous cannot add doctor -> 401", r.status === 401, r);
    r = await call("POST", "/doctors", { name: "Dr. Test New", specialty: "Wizard", fees: 10 }, adminToken);
    check("invalid specialty -> 400", r.status === 400, r);
    r = await call("POST", "/doctors", { name: "Dr. Test New", specialty: "Cardiologist", fees: 75, experience: 3, email: `newdoc${Date.now()}@test.com`, accountPassword: "doctorpass1", isActive: false }, adminToken);
    check("admin adds doctor (+ login account; isActive can't be forced)", r.status === 201 && r.body.doctor.isActive === true && r.body.doctor.user, r);
    const newDocId = r.body.doctor._id;
    r = await call("PUT", `/doctors/${newDocId}`, { fees: 99, startTime: "20:00", endTime: "09:00" }, adminToken);
    check("end time before start time -> 400", r.status === 400, r);
    r = await call("PUT", `/doctors/${newDocId}`, { fees: 99 }, adminToken);
    check("admin updates doctor", r.status === 200 && r.body.doctor.fees === 99, r);
    r = await call("PATCH", `/doctors/${newDocId}/status`, { isActive: false }, adminToken);
    check("admin deactivates doctor", r.status === 200 && r.body.doctor.isActive === false, r);
    r = await call("GET", `/doctors/${newDocId}`);
    check("deactivated doctor hidden from public", r.status === 404, r);
    r = await call("DELETE", `/doctors/${newDocId}`, null, adminToken);
    check("admin deletes doctor without appointments", r.status === 200, r);

    // ---- Appointments ----
    const docs = (await call("GET", "/doctors?specialty=General%20Physician")).body.doctors;
    const richard = docs.find((d) => d.name === "Dr. Richard James");
    const date = nextWorkingDate(richard.workingDays);
    r = await call("GET", `/doctors/${richard._id}/slots?date=${date}`);
    check("slots endpoint", r.status === 200 && r.body.slots.length > 0, r);
    const time = r.body.slots.find((s) => !s.isBooked).time;

    r = await call("POST", "/appointments", { doctorId: richard._id, date, time }, adminToken);
    check("admin cannot book as patient -> 403", r.status === 403, r);
    r = await call("POST", "/appointments", { doctorId: richard._id, date: "2020-01-01", time }, patientToken);
    check("past date rejected", r.status === 400, r);
    r = await call("POST", "/appointments", { doctorId: richard._id, date: "2030-02-31", time }, patientToken);
    check("impossible date rejected", r.status === 400, r);
    r = await call("POST", "/appointments", { doctorId: richard._id, date, time: "03:00" }, patientToken);
    check("time outside working hours rejected", r.status === 400, r);
    r = await call("POST", "/appointments", { doctorId: richard._id, date, time: "10:15" }, patientToken);
    check("time not on a slot boundary rejected", r.status === 400, r);
    r = await call("POST", "/appointments", { doctorId: richard._id, date, time, reason: "Fever" }, patientToken);
    check("create appointment", r.status === 201 && r.body.appointment.status === "booked", r);
    const apptId = r.body.appointment?._id;

    const patient2Token = (await call("POST", "/auth/register", { name: "Second Patient", email: `p2${Date.now()}@test.com`, password: "password123" })).body.token;
    r = await call("POST", "/appointments", { doctorId: richard._id, date, time }, patient2Token);
    check("double booking prevented -> 409", r.status === 409, r);
    const slots = (await call("GET", `/doctors/${richard._id}/slots?date=${date}`)).body.slots;
    check("booked slot shows isBooked", slots.find((s) => s.time === time)?.isBooked === true, slots[0]);
    // two patients click "Book" on the same slot at the same moment: the unique DB index lets only one win
    const raceTime = slots.find((s) => !s.isBooked).time;
    const race = await Promise.all([
        call("POST", "/appointments", { doctorId: richard._id, date, time: raceTime }, patientToken),
        call("POST", "/appointments", { doctorId: richard._id, date, time: raceTime }, patient2Token)
    ]);
    check("simultaneous bookings: exactly one wins", race.filter((x) => x.status === 201).length === 1 && race.filter((x) => x.status === 409).length === 1, race.map((x) => x.status));

    const [y, m, d] = date.split("-").map(Number);
    const other = docs.find((doc) => doc.name !== "Dr. Richard James" && doc.workingDays.includes(new Date(y, m - 1, d).getDay()));
    r = await call("POST", "/appointments", { doctorId: other._id, date, time }, patientToken);
    check("patient can't be in two appointments at once", r.status === 409, r);

    r = await call("GET", "/appointments", null, patientToken);
    check("get my appointments", r.status === 200 && r.body.appointments.some((a) => a._id === apptId && a.doctor.name), r);
    r = await call("GET", "/appointments", null, patient2Token);
    check("another patient does not see it", !r.body.appointments.some((a) => a._id === apptId), r.body);
    r = await call("GET", `/appointments/${apptId}`, null, patient2Token);
    check("another patient cannot read it -> 404", r.status === 404, r);
    r = await call("PATCH", `/appointments/${apptId}/cancel`, null, patient2Token);
    check("another patient cannot cancel it -> 404", r.status === 404, r);
    r = await call("PATCH", `/appointments/${apptId}/status`, { status: "confirmed" }, patientToken);
    check("patient cannot change status -> 403", r.status === 403, r);

    r = await call("GET", "/appointments/doctor", null, doctorToken);
    check("doctor sees own appointments", r.status === 200 && r.body.appointments.some((a) => a._id === apptId), r);
    const otherDoctorToken = await login(call, "emily.larson@prescripto.test", process.env.SEED_DOCTOR_PASSWORD);
    r = await call("PATCH", `/appointments/${apptId}/status`, { status: "confirmed" }, otherDoctorToken);
    check("another doctor cannot update it -> 404", r.status === 404, r);
    r = await call("PATCH", `/appointments/${apptId}/status`, { status: "confirmed" }, doctorToken);
    check("doctor confirms appointment", r.status === 200 && r.body.appointment.status === "confirmed", r);
    r = await call("PATCH", `/appointments/${apptId}/status`, { status: "completed" }, doctorToken);
    check("cannot complete a future appointment", r.status === 400, r);
    r = await call("PATCH", `/appointments/${apptId}/status`, { status: "flying" }, adminToken);
    check("invalid status -> 400", r.status === 400, r);
    r = await call("PATCH", `/appointments/${apptId}/cancel`, null, patientToken);
    check("patient cancels own appointment", r.status === 200 && r.body.appointment.status === "cancelled" && r.body.appointment.cancelledBy === "patient", r);
    r = await call("PATCH", `/appointments/${apptId}/status`, { status: "confirmed" }, adminToken);
    check("cancelled appointment cannot be re-confirmed", r.status === 400, r);
    r = await call("POST", "/appointments", { doctorId: richard._id, date, time }, patient2Token);
    check("cancelled slot can be booked again", r.status === 201, r);

    r = await call("DELETE", `/doctors/${richard._id}`, null, adminToken);
    check("doctor with appointment history cannot be deleted -> 409", r.status === 409, r);
    r = await call("GET", "/nope");
    check("unknown route -> 404 JSON", r.status === 404 && r.body.message, r);

    // ---- brute-force protection (max 10 failed auth attempts / 15 min; 4 failures happened above) ----
    const statuses = [];
    for (let i = 0; i < 8; i++) statuses.push((await call("POST", "/auth/login", { email, password: `wrong-${i}` })).status);
    check("too many failed logins -> 429", statuses.includes(429) && statuses.slice(0, 6).every((s) => s === 401), statuses);

    return result();
};
