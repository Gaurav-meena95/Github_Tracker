const express = require('express')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const app = express()
const cors = require('cors')
app.use(cors())
app.use(express.json())

app.listen(3001,()=>{
    console.log('Server run sucessfully on port 3001')
})