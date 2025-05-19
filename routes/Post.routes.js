const express = require('express');
const router = express.Router();

const {
    GetAllPost,
    GetPostById,
    CreatePost,
    UpdatePost,
    DeletePost,
    userPost,
    addComment,
    likePost
} = require("../controllers/Post.controller");

// GET || All blogs
router.get("/all-post", GetAllPost); //D

// GET || Single blog
router.get("/get-post/:id", GetPostById);

// POST || Create blog
router.post("/create-post", CreatePost); //D

// PUT || Update blog
router.put("/update-post/:id", UpdatePost);

// DELETE || Delete blog
router.delete("/delete-post/:id", DeletePost); //D

//GET || user blog
router.get("/user-post/:id", userPost);

//POST || Comments
router.post("/comment/:postId",addComment);

//POST || Like
router.post("/like/:postId",likePost);

module.exports = router;