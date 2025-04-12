const Messages = require("../models/messageModel");

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      $or:[{sender: from, reciever: to}, {sender: to, reciever: from}]
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        _id: msg._id.toString(), // Convert ObjectId to string
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
        timestamp: msg.createdAt,
        isDeleted: msg.isDeleted || false
      };
    });
    
    console.log("Sending messages to client:", projectedMessages);
    res.json(projectedMessages);
  } catch (error) {
    console.error("Error in getMessages:", error);
    next(error);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message, timestamp } = req.body;
    
    const data = await Messages.create({
      message: { text: message },
      sender: from,
      reciever: to,
      timestamp: timestamp || new Date(),
      isDeleted: false
    });

    // Return the ID of the newly created message
    if (data) {
      return res.json({ 
        msg: "Message added successfully.",
        messageId: data._id.toString() // Send back the message ID
      });
    } else {
      return res.json({ msg: "Failed to add message to the database" });
    }
  } catch (error) {
    console.error("Error in addMessage:", error);
    next(error);
  }
};

module.exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId, markAsDeleted } = req.body;
    
    console.log("Delete message request received:", { messageId, markAsDeleted });
    
    if (!messageId) {
      return res.status(400).json({ 
        status: false,
        msg: "Message ID is required" 
      });
    }
    
    // Check if message exists
    let message;
    try {
      message = await Messages.findById(messageId);
    } catch (err) {
      console.error("Error finding message:", err);
      // The messageId might not be a valid ObjectId format
      if (err.name === 'CastError') {
        return res.status(400).json({ 
          status: false,
          msg: "Invalid message ID format" 
        });
      }
      
      return res.status(500).json({ 
        status: false,
        msg: "Database error" 
      });
    }
    
    if (!message) {
      return res.status(404).json({ 
        status: false,
        msg: "Message not found" 
      });
    }
    
    console.log("Found message:", message);
    
    if (markAsDeleted) {
      // Update the message to mark it as deleted but keep in database
      try {
        const updatedMessage = await Messages.findByIdAndUpdate(
          messageId, 
          { isDeleted: true },
          { new: true } // Return the updated document
        );
        
        console.log("Message marked as deleted:", updatedMessage);
        
        return res.json({ 
          status: true, 
          msg: "Message marked as deleted",
          updatedMessage: {
            _id: updatedMessage._id.toString(),
            message: updatedMessage.message.text,
            isDeleted: updatedMessage.isDeleted
          }
        });
      } catch (err) {
        console.error("Error updating message:", err);
        return res.status(500).json({ 
          status: false,
          msg: "Failed to update message" 
        });
      }
    } else {
      // Original delete behavior as fallback
      try {
        await Messages.findByIdAndDelete(messageId);
        
        console.log("Message completely deleted");
        
        return res.json({ 
          status: true, 
          msg: "Message deleted successfully" 
        });
      } catch (err) {
        console.error("Error deleting message:", err);
        return res.status(500).json({ 
          status: false,
          msg: "Failed to delete message" 
        });
      }
    }
    
  } catch (ex) {
    console.error("Unexpected error in deleteMessage:", ex);
    next(ex);
  }
};