// Admin APIs: authorization, dashboard stats, filters, user activation.
// Expects a freshly seeded database: seed --reset --demo-appointments (5 patients, 34 appointments).
const { createSuite, createClient, login } = require("./lib");

module.exports = async ({ baseUrl }) => {
    const { check, result } = createSuite("Admin");
    const call = createClient(baseUrl);

    const admin = await login(call, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    const doctor = await login(call, "richard.james@prescripto.test", process.env.SEED_DOCTOR_PASSWORD);
    const patient = await login(call, "aarav.shah@patient.test", process.env.SEED_PATIENT_PASSWORD);
    check("admin, doctor and patient can log in", admin && doctor && patient);

    for (const path of ["/admin/stats", "/admin/doctors", "/admin/users", "/admin/appointments"]) {
        const statuses = [await call("GET", path), await call("GET", path, null, patient), await call("GET", path, null, doctor)].map((x) => x.status);
        check(`${path}: anonymous 401 / patient 403 / doctor 403`, statuses.join() === "401,403,403", statuses);
    }

    let r = await call("GET", "/admin/stats", null, admin);
    const s = r.body.stats;
    check("stats: 15 doctors, 5 patients", r.status === 200 && s.totalDoctors === 15 && s.totalPatients === 5, s);
    check("status counts add up to the total (34)", Object.values(s.byStatus).reduce((a, b) => a + b, 0) === s.totalAppointments && s.totalAppointments === 34, s.byStatus);
    check("specialty breakdown: 8 entries, adds up", s.bySpecialty.length === 8 && s.bySpecialty.reduce((a, b) => a + b.count, 0) === 34, s.bySpecialty);
    check("14-day booking trend", s.bookingsLast14Days.length === 14 && s.bookingsLast14Days.some((d) => d.count > 0), s.bookingsLast14Days);
    check("latest 5 bookings", r.body.latestAppointments.length === 5, r.body.latestAppointments.length);

    r = await call("GET", "/admin/doctors?status=active", null, admin);
    check("admin doctor list includes emails", r.body.count === 15 && r.body.doctors.every((d) => d.email), r.body.count);
    const derm = r.body.doctors.find((d) => d.specialty === "Dermatologist");
    await call("PATCH", `/doctors/${derm._id}/status`, { isActive: false }, admin);
    r = await call("GET", "/admin/doctors?status=inactive", null, admin);
    check("inactive filter", r.body.count === 1 && r.body.doctors[0]._id === derm._id, r.body);
    r = await call("GET", "/doctors?specialty=Dermatologist");
    check("deactivated doctor hidden from patients", r.body.count === 1, r.body.count);
    await call("PATCH", `/doctors/${derm._id}/status`, { isActive: true }, admin);
    r = await call("GET", `/admin/doctors/${derm._id}`, null, admin);
    check("admin gets full doctor record", r.status === 200 && r.body.doctor.email && r.body.doctor.user?.email, r.body);

    r = await call("GET", "/admin/users?role=patient", null, admin);
    check("users filtered by role", r.body.total === 5 && r.body.users.every((u) => u.role === "patient"), r.body.total);
    check("user list never contains passwords", !JSON.stringify(r.body).includes("password"));
    r = await call("GET", "/admin/users?limit=5&page=2", null, admin);
    check("users pagination", r.body.page === 2 && r.body.users.length === 5 && r.body.pages === 5, [r.body.page, r.body.pages, r.body.users.length]);
    const aarav = (await call("GET", "/admin/users?search=aarav", null, admin)).body.users[0];
    r = await call("GET", `/admin/users/${aarav._id}`, null, admin);
    check("user details with appointment counts", r.status === 200 && typeof r.body.appointmentCounts.completed === "number", r.body);

    r = await call("PATCH", `/admin/users/${aarav._id}/status`, { isActive: false }, admin);
    check("admin deactivates a patient", r.status === 200 && r.body.user.isActive === false, r);
    r = await call("GET", "/auth/me", null, patient);
    check("deactivated patient's existing token stops working (403)", r.status === 403, r);
    r = await call("POST", "/auth/login", { email: "aarav.shah@patient.test", password: process.env.SEED_PATIENT_PASSWORD });
    check("deactivated patient cannot log in", r.status === 403, r);
    await call("PATCH", `/admin/users/${aarav._id}/status`, { isActive: true }, admin);
    r = await call("GET", "/auth/me", null, patient);
    check("reactivated patient works again", r.status === 200, r);

    const adminUser = (await call("GET", "/auth/me", null, admin)).body.user;
    r = await call("PATCH", `/admin/users/${adminUser._id}/status`, { isActive: false }, admin);
    check("admin cannot deactivate themselves", r.status === 400, r);
    r = await call("PATCH", `/admin/users/${aarav._id}/status`, { isActive: "no" }, admin);
    check("isActive must be a boolean", r.status === 400, r);

    r = await call("GET", "/admin/appointments?status=completed", null, admin);
    check("appointments: status filter", r.body.total > 0 && r.body.appointments.every((a) => a.status === "completed"), r.body.total);
    r = await call("GET", `/admin/appointments?doctor=${derm._id}`, null, admin);
    check("appointments: doctor filter", r.body.appointments.every((a) => a.doctor._id === derm._id), r.body);
    const someDate = (await call("GET", "/admin/appointments", null, admin)).body.appointments[0].date;
    r = await call("GET", `/admin/appointments?date=${someDate}`, null, admin);
    check("appointments: date filter", r.body.total > 0 && r.body.appointments.every((a) => a.date === someDate), r.body.total);
    check("bad date filter -> 400", (await call("GET", "/admin/appointments?date=bad", null, admin)).status === 400);
    check("bad doctor filter -> 400", (await call("GET", "/admin/appointments?doctor=xyz", null, admin)).status === 400);

    const booked = (await call("GET", "/admin/appointments?status=booked", null, admin)).body.appointments[0];
    r = await call("PATCH", `/appointments/${booked._id}/status`, { status: "confirmed" }, admin);
    check("admin confirms an appointment", r.status === 200 && r.body.appointment.status === "confirmed", r);
    r = await call("PATCH", `/appointments/${booked._id}/cancel`, null, admin);
    check("admin cancels an appointment", r.status === 200 && r.body.appointment.cancelledBy === "admin", r);

    r = await call("PATCH", `/admin/users/${aarav._id}/status`, { isActive: true, $where: "1" }, admin);
    check("operator keys ($...) are stripped from request bodies", r.status === 200, r);

    return result();
};
