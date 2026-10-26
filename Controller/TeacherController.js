//Teacher manipulation
const TeacherModel = require("../Models/TeacherModel");
const crypto = require('crypto');
const generator = require("generate-password");

//http://127.0.0.1:8000/teacher
//posting data to db-(teachers)
const createTeacher = async (req, res) => {
    console.log("api called");

    //password creation
    const password = generator.generate({
        length: 10,
        numbers: true
    });

    console.log(password);

    const { name, email, pin, city, phonenumber, subject, standard, division } = req.body;   //data from frontend-- api

    if (!name) {
        return res.send({
            message: "Please enter your name"
        })
    }
    try {
        const newTeacher = new TeacherModel({  //storing data to db
            name,    //if both names are same then this is enough
            Email: email,
            Password: password,
            city: city,
            pin: pin,
            //    city:address.city,
            //    pin:address.pin,
            phoneNumber: phonenumber,
            subject: subject,
            standard: standard,
            division
        });
        await newTeacher.save();
        const resData = {
            name: newTeacher.name,
            email: newTeacher.Email,
            password: newTeacher.Password

        }
        console.log(resData, "data");
        res.send({
            message: "Teacher created successfully",
            data: resData

        })

    } catch (er) {
        console.log("error", er);
    }
};

//get data from db 
const getTeachers = async (req, res) => {
    try {
        const TeachersData = await TeacherModel.find();
        res.send({
            message: "Teachers data fetched successfully",
            data: TeachersData
        })
    } catch (error) {
        res.send({
            message: "Error",
        })
        console.log(error, "error occ");
    }

};

//get particular data with id
const getTeacherById = async (req, res) => {
    try {
        const id = req.params.teachersid;

        const Teacher = await TeacherModel.findById(id);
        if (!Teacher) {
            res.send({
                message: "Teachers data not available"
            })
        }
        res.send({
            message: "Teacher datafetched successfully",
            data: Teacher
        })
    } catch (error) {
        res.send({
            message: "Error",
        })
        console.log(error, "error occ");
    }
};



//update
const updateTeacher = async (req, res) => {
    const { name, address, phonenumber, subject, standard } = req.body;
    try {
        const id = req.params.teacherid;
        const isTeacherAvailable = await TeacherModel.findById(id);
        if (!isTeacherAvailable) {
            res.send({
                message: "Teacher not available"
            })
        }

        const updatedTeacher = await TeacherModel.findByIdAndUpdate(
            id,
            req.body,
            { returnDocument: "after" }                 //{new:true} replaced in new version
        );
        res.send({
            message: "updated teacher data",
            data: updatedTeacher
        })
    } catch (error) {
        res.send({
            message: "Not updated"
        })
    }
};
//delete
const deleteTeacher = async (req, res) => {
    const id = req.params.teacherid;
    const TeacherAvailable = await TeacherModel.findById(id); //or  await TeacherModel.deleteOne({_id:id});
    if (!TeacherAvailable) {
        res.send({
            message: "Not Teacher"
        })
    }
    await TeacherModel.findByIdAndDelete(id);
    res.send({
        message: "Teacher data deleted successfully"
    })
}
//Login
const TeacherLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.send({
                message: "Enter Valid email and password"
            })
        }
        const fetchedTeacherData = await TeacherModel.findOne({ Email: email });
        if (!fetchedTeacherData) {
            return res.send({
                message: "No matching email found"
            })
        }
        if (fetchedTeacherData.Password === password) {
            const jwt = require("jsonwebtoken");
            const token = jwt.sign(
                { id: fetchedTeacherData._id, role: "teacher" },
                process.env.JWT_SECRET || "myschoolsecretkey",
                { expiresIn: "7d" }
            );

            return res.send({
                message: "Login Successful",
                data: {
                    email: fetchedTeacherData.Email || fetchedTeacherData.email,
                    name: fetchedTeacherData.name,
                    id: fetchedTeacherData._id,
                    token: token
                }
            })
        }

        return res.send({
            message: "Invalid password"
        });

    } catch (error) {
        console.error("Teacher login error:", error);
        return res.status(500).send({
            message: "Error in login"
        });
    }
}

module.exports = { createTeacher, getTeachers, getTeacherById, updateTeacher, deleteTeacher, TeacherLogin }