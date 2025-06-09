const bcrypt = require("bcrypt");

async function generateHashedPasswords() {
  const users = [
    { username: "Dannis", plaintextPassword: "123456", role: "superadmin" },
    { username: "Janice", plaintextPassword: "123456", role: "admin" },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.plaintextPassword, 10);
    console.log(`Username: ${user.username}, Hashed Password: ${hashedPassword}`);
  }
}

generateHashedPasswords().catch((err) => console.error(err));

/*
db.admins.insertMany([
  {
    username: "Dannis",
    password: "$2b$10$QEVcaenzo88igk/NTZoOB.eF1wbjhjteFcsScx7McOTDXg97fL69O", // Replace with Dannis' hashed password
    role: "superadmin",
  },
  {
    username: "Janice",
    password: " $2b$10$S.Z0u3zY90EgkEDC0NrWt.XmrlgrKTl7N74FiDwwD9cEM1uevWvi2", // Replace with Janice's hashed password
    role: "admin",
  },
]);
*/