
import React, { useState, useEffect, useRef} from "react";
import axios from "axios";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import { getMessageRoute, sendMessageRoute, deleteMessageRoute } from "../utils/APIroute";
import { v4 as uuidv4 } from "uuid";
import {IoPersonCircle} from "react-icons/io5";
import {MdDeleteOutline} from "react-icons/md";

import "react-toastify/dist/ReactToastify.css";


export default function ChatContainer(props) {
    const scrollRef = useRef();
    const [messages, setMessages] = useState([]);
    const [incoming, setIncoming] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);

    const getAllMessages = async()=>{
        const user = await JSON.parse(localStorage.getItem('chat-app-user'));
       
        const res = await axios.post(getMessageRoute,{
            from : user._id,
            to : props.currentChat._id
        });
        
        console.log("Raw messages from API:", res.data);
        
        // Debug: Check if messages have _id property
        const hasIds = res.data.every(msg => msg._id);
        console.log("All messages have IDs:", hasIds);
        
        // Ensure each message has a timestamp and _id if it doesn't already have one
        const processedMessages = res.data.map((msg, index) => {
            // For debugging only
            if (!msg._id) {
                console.warn(`Message at index ${index} missing _id:`, msg);
                // Assign a temporary ID for frontend use only
                msg._id = `temp-${uuidv4()}`;
            }
            
            // If the message is marked as deleted in the database, show the deleted text
            if (msg.isDeleted) {
                console.log("Found deleted message:", msg._id);
                return { ...msg, message: "This message was deleted" };
            }
            
            if (!msg.timestamp) {
                // If no timestamp exists, add the current time
                return { ...msg, timestamp: new Date().toISOString() };
            }
            
            return msg;
        });
        
        console.log("Processed messages:", processedMessages);
        setMessages(processedMessages);
    }
    
    useEffect(()=>{
        if(props.currentChat){
            getAllMessages();
        }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.currentChat])


    const handleSend = async(msg) =>{
        const user = await JSON.parse(localStorage.getItem('chat-app-user'));
        const currentTime = new Date().toISOString();

        const response = await axios.post(sendMessageRoute,{
            from : user._id,
            to : props.currentChat._id,
            message : msg,
            timestamp: currentTime
        });
        
        // Get the message ID from the response if available
        let messageId = null;
        if (response.data && response.data.messageId) {
            messageId = response.data.messageId;
        } else {
            // Generate a temporary ID if not available from server
            messageId = `temp-${uuidv4()}`;
        }
        
        props.socket.current.emit("send-msg",{
            to : props.currentChat._id,
            from : user._id,
            message : msg,
            timestamp: currentTime,
            _id: messageId
        });

        props.socket.current.emit("send-notification",{
            to : props.currentChat._id,
            from : user._id,
            message : msg,
            timestamp: currentTime
        });

        const updatedMessages = [...messages];
        updatedMessages.push({
            _id: messageId,
            fromSelf: true, 
            message: msg,
            timestamp: currentTime
        });
        setMessages(updatedMessages);
    }

    useEffect(()=>{
        if(props.socket.current){
            props.socket.current.on("msg-recieve", (data)=>{
                setIncoming({
                    _id: data._id || `temp-${uuidv4()}`,
                    fromSelf: false, 
                    message: data.message, 
                    timestamp: data.timestamp || new Date().toISOString()
                });
            });
        }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

    useEffect(()=>{
        incoming && (setMessages((prev) => [...prev, incoming]));
    },[incoming]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    const handleDeleteMessage = async (messageId) => {
        try {
            console.log("Attempting to delete message ID:", messageId);
            
            if (!messageId) {
                console.error("Message ID is undefined or null");
                return;
            }
            
            // Make an API call to mark the message as deleted in the database
            const response = await axios.post(deleteMessageRoute, {
                messageId: messageId,
                markAsDeleted: true
            });
            
            console.log("Delete API response:", response.data);
            
            if (response.data && response.data.status) {
                // Update the message in local state to show "This message was deleted"
                setMessages(prevMessages => 
                    prevMessages.map(msg => {
                        if (msg._id === messageId) {
                            console.log("Marking message as deleted:", msg);
                            return { ...msg, message: "This message was deleted", isDeleted: true };
                        }
                        return msg;
                    })
                );
                console.log("Message deleted successfully");
            } else {
                console.error("Failed to delete message:", response.data ? response.data.msg : "Unknown error");
            }
            
            // Close the delete confirmation dialog
            setShowDeleteConfirm(false);
            setSelectedMessage(null);
            setMessageToDelete(null);
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    // Function to handle the delete button click
    const handleDeleteButtonClick = (message) => {
        console.log("Delete button clicked for message:", message);
        setMessageToDelete(message._id);
        setShowDeleteConfirm(true);
    };

    // Function to format the date and time
    const formatMessageTime = (timestamp) => {
        if (!timestamp) return "";
        
        const date = new Date(timestamp);
        
        // Check if the date is valid
        if (isNaN(date.getTime())) return "";
        
        // Format the date
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let dateStr = "";
        
        if (date.toDateString() === today.toDateString()) {
            dateStr = "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            dateStr = "Yesterday";
        } else {
            dateStr = date.toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
        
        // Format the time
        const timeStr = date.toLocaleTimeString(undefined, { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        });
        
        return `${dateStr} at ${timeStr}`;
    };

    return (
      <>        
        <Container>
            <div className="chat-header">
                <div className="user-details">
                <div className="avatar">
                  {
                     props.currentChat.avatarImage ? 
                    (<img src={props.currentChat.avatarImage} alt=""/>) : 
                    (<IoPersonCircle/>)
                  }
                </div>
                <div className="username">
                    <h3>{props.currentChat.username}</h3>
                </div>
                </div>
            </div>
            <div className="chat-messages">
                {
                    messages.map((message)=>{
                        return(
                            <div ref={scrollRef} key={uuidv4()}>
                                <div className={`message ${message.fromSelf ? "sended" : "recieved"} ${message.isDeleted ? "deleted" : ""}`}>
                                    <div 
                                        className="message-container"
                                        onMouseEnter={() => !message.isDeleted && message.fromSelf && setSelectedMessage(message._id)}
                                        onMouseLeave={() => !showDeleteConfirm && setSelectedMessage(null)}
                                    >
                                        <div className="message-content">
                                            <p>{message.message}</p>
                                        </div>
                                        <div className="message-timestamp">
                                            {formatMessageTime(message.timestamp)}
                                        </div>
                                        {selectedMessage === message._id && message.fromSelf && !message.isDeleted && (
                                            <div className="message-actions">
                                                <button 
                                                    className="delete-btn" 
                                                    onClick={() => handleDeleteButtonClick(message)}
                                                    title="Delete message"
                                                >
                                                    <MdDeleteOutline />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {showDeleteConfirm && messageToDelete === message._id && (
                                        <div className="delete-confirmation">
                                            <p>Delete this message?</p>
                                            <div className="delete-actions">
                                                <button 
                                                    className="confirm-btn" 
                                                    onClick={() => handleDeleteMessage(message._id)}
                                                >
                                                    Delete
                                                </button>
                                                <button 
                                                    className="cancel-btn" 
                                                    onClick={() => {
                                                        setShowDeleteConfirm(false);
                                                        setSelectedMessage(null);
                                                        setMessageToDelete(null);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                }
            </div>
            <ChatInput sendMessage={handleSend} messages={messages}/>
        </Container>
        {/* <ToastContainer/> */}
      </>
    )
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 75% 15%;
  gap: 0.1rem;
  overflow: hidden;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 10% 75% 15%;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem 0 1rem;
    background-color :#075e54;
    border-left-width: medium
    border-color : white;
    .user-details {
      display: flex;
      align-items: center;
      height : 0.5rem;
      .avatar {
        img {
          height: 3rem;
          width : 3rem;
          border-radius : 3rem;
        }
        svg {
          color : #A0A0A0;
          font-size: 3rem;
          cursor: pointer;
        }
      }
      .username {
        h3 {
          color: white;
        }
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    color : black;
    background-color : #ece5dd;
    &::-webkit-scrollbar {
      margin-top: 10px;
      margin-bottom: 10px;
      width: 0.2rem;
     
      &-thumb {
        background-color: grey;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: inline-block;
      align-items: center;
      height : 100%;
      border-bottom-left-radius : 0.5rem;
      border-bottom-right-radius : 0.5rem;
      padding : 0.5rem;
      position: relative;
      
      &.deleted {
        opacity: 0.7;
        
        .message-content {
          font-style: italic;
          
          p {
            color: #777;
          }
        }
      }
      
      .message-container {
        position: relative;
      }
      
      .message-content {
        overflow-wrap: break-word;
        margin-bottom: 4px;
      }
      
      .message-timestamp {
        font-size: 11px;
        color: #777;
        text-align: right;
        padding-top: 3px;
      }
      
      .message-actions {
        position: absolute;
        top: -20px;
        right: 0;
        display: flex;
        gap: 5px;
        
        .delete-btn {
          background-color: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
          
          svg {
            color: #FF5252;
            font-size: 16px;
          }
          
          &:hover {
            background-color: #FF5252;
            transform: scale(1.1);
            
            svg {
              color: white;
            }
          }
        }
      }
      
      .delete-confirmation {
        position: absolute;
        top: 0;
        right: 0;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        padding: 10px;
        z-index: 5;
        min-width: 150px;
        
        p {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #333;
          text-align: center;
        }
        
        .delete-actions {
          display: flex;
          justify-content: space-between;
          
          button {
            padding: 5px 10px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .confirm-btn {
            background-color: #FF5252;
            color: white;
            
            &:hover {
              background-color: #FF1744;
            }
          }
          
          .cancel-btn {
            background-color: #E0E0E0;
            color: #333;
            
            &:hover {
              background-color: #BDBDBD;
            }
          }
        }
      }
      
      .content {
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
      }
    }
    .sended {
      float : right;
      justify-content: flex-end;
      background-color: #dcf8c6;
      padding-right : 1rem;
      max-width : 60%;
      border-top-left-radius: 0.5rem;
      .message-timestamp {
        color: #5c8462;
      }
    }
    .recieved {
      padding-left : 1rem;
      justify-content: flex-start;
      max-width : 60%;
      background-color: #ffff;
      border-top-right-radius: 0.5rem;
    }
  }
`;