const db = require('d:/web-collab-portal/backend/config/db');
const fs = require('fs');
async function checkConstraints() {
    try {
        const [tasks] = await db.execute("SHOW CREATE TABLE tasks");
        const [members] = await db.execute("SHOW CREATE TABLE project_members");
        fs.writeFileSync('d:/web-collab-portal/tmp/constraints.txt',
            "TASKS:\n" + tasks[0]['Create Table'] + "\n\nMEMBERS:\n" + members[0]['Create Table']
        );
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}
checkConstraints();
