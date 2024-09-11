const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://iservebarangay:agIB3Xn6pUhwmPyY@isb-server.3jomc.mongodb.net/?retryWrites=true&w=majority&appName=isb-server')
    .then(() => console.log('>> Established a connection to the database <<'))
    .catch(err => console.log('>> Something went wrong when connecting to the database <<', err));  
