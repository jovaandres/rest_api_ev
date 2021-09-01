const catchAsync = require('../utils/catchAsync')
const fs = require('fs');
let jsonTugas = require('../public/json/data_tugas.json')

const getAllTugas = catchAsync(async(req, res) => {
    return res.status(200).json(jsonTugas)
})

const getTugas = catchAsync(async(req, res) => {
    const _id = req.params.id
    const newJson = jsonTugas.filter((obj) => obj.category === _id)
    res.status(200).json(newJson)
})

const addTugas = catchAsync(async(req, res) => {
    req.checkBody('category', 'jurusan tidak ada.').notEmpty();
    req.checkBody('deadline', 'deadline tidak ada.').notEmpty();
    req.checkBody('title', 'title pertanyaan tidak ada.').notEmpty();
    req.checkBody('description', 'description tidak ada.').notEmpty();

    const {category, deadline, title, description} = req.body;

    jsonTugas.push({
        "category": category,
        "deadline": deadline,
        "title": title,
        "description": description
    })

    fs.writeFile('./public/json/data_tugas.json', JSON.stringify(jsonTugas), 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }
        console.log("JSON file has been saved.");
    });

    res.status(200).json(jsonTugas)
})

module.exports = {
    getAllTugas,
    getTugas,
    addTugas
}