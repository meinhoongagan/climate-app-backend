const mongoose = require("mongoose");
const POST = require("../models/Post.models");
const User = require("../models/User.js");
const Comments = require("../models/Comments.model.js");
const cloudinary = require("../lib/Cloudinary.js");

// GET All Posts
exports.GetAllPost = async (req, res) => {
  try {
    const posts = await POST.find({})
      .populate("author", "name email")
      .populate({
        path: "Comments",
        populate: { path: "author", select: "name" }
      });

    return res.status(200).send({
      success: true,
      message: "Post list fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error occurred in fetching posts",
      error,
    });
  }
};

// CREATE Post
exports.CreatePost = async (req, res) => {
  try {
    const { title, description, image, author } = req.body;

    if (!title || !description || !image || !author) {
      return res.status(200).send({
        success: false,
        message: "Please provide all fields",
      });
    }

    const existingUser = await User.findById(author);
    if (!existingUser) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }
    
    let imageUrl;
    if (image) {
      const uploadResult = await cloudinary.uploader.upload(image);
      console.log(uploadResult);
      imageUrl = uploadResult.secure_url;
    }

    const newBlog = new POST({ title, description, image: imageUrl, author });

    const session = await mongoose.startSession();
    session.startTransaction();

    await newBlog.save({ session });
    existingUser.Blogs.push(newBlog._id);
    await existingUser.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Populate the new blog for frontend
    const populatedBlog = await POST.findById(newBlog._id)
      .populate("author", "name email")
      .populate({
        path: "Comments",
        populate: { path: "author", select: "name" }
      });

    return res.status(201).send({
      success: true,
      message: "Post created successfully",
      data: populatedBlog,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error while creating post",
      error,
    });
  }
};

// GET Post By ID
exports.GetPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await POST.findById(id)
      .populate("author", "name email")
      .populate({
        path: "Comments",
        populate: { path: "author", select: "name" }
      });

    if (!blog) {
      return res.status(404).send({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Post fetched successfully",
      data: blog,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error fetching the post",
      error,
    });
  }
};

// UPDATE Post
exports.UpdatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image } = req.body;

    let imageUrl = image;
    if (image && image.startsWith("data:")) {
      const uploadResult = await cloudinary.uploader.upload(image);
      imageUrl = uploadResult.secure_url;
    }

    const updatedBlog = await POST.findByIdAndUpdate(
      id,
      { title, description, image: imageUrl },
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).send({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Post updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error updating the post",
      error,
    });
  }
};

// DELETE Post
exports.DeletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await POST.findById(id).populate("author");
    if (!blog) {
      return res.status(404).send({
        success: false,
        message: "Post not found",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    await POST.findByIdAndDelete(id, { session });
    blog.author.Blogs.pull(blog._id);
    await blog.author.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).send({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error deleting the post",
      error,
    });
  }
};

// GET Posts By User
exports.userPost = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate({
      path: "Blogs",
      populate: [
        { path: "author", select: "name email" },
        { path: "Comments", populate: { path: "author", select: "name" } }
      ]
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "User posts fetched successfully",
      data: user.Blogs,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error fetching user posts",
      error,
    });
  }
};

// COMMENTS FUNCTIONALITY

exports.addComment = async (req, res) => {
  try {
    const { userid, content } = req.body;
    const userId = userid;
    const postId = req.params.postId;

    const comment = await Comments.create({
      author: userId,
      postId,
      content,
    });

    await User.findByIdAndUpdate(userId, { $push: { Comments: comment._id } });
    await POST.findByIdAndUpdate(postId, { $push: { Comments: comment._id } });

    // Populate author for frontend
    const populatedComment = await Comments.findById(comment._id).populate("author", "name");

    res.status(201).send({
      success: true,
      message: "Comment added successfully",
      data: populatedComment,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Error in comments",
      error,
    });
  }
};

exports.likePost = async (req, res) => {
  try {
    const { userid } = req.body;
    const userId = userid;
    const postId = req.params.postId;

    const post = await POST.findById(postId);
    const user = await User.findById(userId);

    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isLiked = post.likes.some(id => id.toString() === userId);

    if (isLiked) {
      post.likes.pull(userId);
      user.likes.pull(postId);
    } else {
      post.likes.push(userId);
      user.likes.push(postId);
    }

    await post.save();
    await user.save();

    res.status(200).json({ Liked: !isLiked });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in likes",
      error,
    });
  }
};