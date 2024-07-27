const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
require('dotenv').config();

const sequelize = require('./config/database');
const User = require('./models/user');

const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

async function authenticateDB() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

authenticateDB();

sequelize.sync({ force: false }).then(() => {
    console.log('Database & tables created!');
});

app.get('/', (req, res) => {
    res.render('form');
});

app.post('/submit', async (req, res) => {
    const { username, email, dob } = req.body;
    await User.create({ username, email, dob });
    res.send('Data submitted successfully!');
});

cron.schedule('0 7 * * *', async () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const users = await User.findAll({
        where: {
            [Op.and]: [
                sequelize.where(sequelize.fn('MONTH', sequelize.col('dob')), month),
                sequelize.where(sequelize.fn('DAY', sequelize.col('dob')), day)
            ]
        }
    });

    for (const user of users) {
        sendBirthdayEmail(user.email, user.username);
    }
});

async function sendBirthdayEmail(email, username) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    let info = await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: 'Happy Birthday!',
        text: `Dear ${username},\n\nWishing you a very happy birthday! Have a great day!\n\nBest Regards,\nYour Company`
    });

    console.log('Message sent: %s', info.messageId);
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
