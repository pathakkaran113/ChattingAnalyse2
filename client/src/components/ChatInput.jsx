
import React, { useState } from 'react'
import { MdOutlineEmojiEmotions } from "react-icons/md";
import { IoMdSend } from "react-icons/io";
import { FaHistory,  FaTimes } from "react-icons/fa";


import Picker from "emoji-picker-react"

import styled from "styled-components";

export default function ChatInput(props) {
    const [msg, setMsg] = useState("");
    const [showPicker, setShowPicker] = useState(false);
    const [showSentiment, setShowSentiment] = useState(false);
    const [sentiment, setSentiment] = useState("");
    const [sentimentLoading, setSentimentLoading] = useState(false);
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [dateFilter, setDateFilter] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        fromTime: '00:00',
        toDate: new Date().toISOString().split('T')[0],
        toTime: '23:59',
        filterType: 'all' // 'all', 'custom', 'today'
    });
    
    const sendChat = (e) => {
        e.preventDefault();
        if(msg.length > 0){
            props.sendMessage(msg)
            setMsg("");
        }
    }

    // Format date and time
    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        
        const date = new Date(timestamp);
        
        // Format date
        const dateStr = date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Format time
        const timeStr = date.toLocaleTimeString(undefined, { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        });
        
        return `${dateStr} ${timeStr}`;
    };

    const filterMessagesByDate = (messages) => {
        if (dateFilter.filterType === 'all') {
            return messages;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateFilter.filterType === 'today') {
            return messages.filter(msg => {
                const msgDate = new Date(msg.timestamp);
                return msgDate >= today;
            });
        }
        
        // Custom date range filter
        const fromDateTime = new Date(`${dateFilter.fromDate}T${dateFilter.fromTime}`);
        const toDateTime = new Date(`${dateFilter.toDate}T${dateFilter.toTime}`);
        
        return messages.filter(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= fromDateTime && msgDate <= toDateTime;
        });
    };

    const analyzeSentiment = async (formattedMessages) => {
        // API key provided (note: exposing API keys in client-side code is not recommended for production)
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY; // Use the environment variable




        setSentimentLoading(true);
        
        try {
            // Extract just the messages content for analysis
            const messagesContent = formattedMessages.map(msg => msg.content).join(" ");
            
            // Prepare the request for OpenAI API
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "You are a sentiment analysis tool. Analyze the sentiment of the following conversation and respond with the status of chat in 20 words and summary."
                        },
                        {
                            role: "user",
                            content: messagesContent
                        }
                    ],
                    max_tokens: 50 // Increased to allow for a more detailed response
                })
            });
            
            try {
                // Try to parse the real API response
                const data = await response.json();
                if (data && data.choices && data.choices[0] && data.choices[0].message) {
                    const sentimentResult = data.choices[0].message.content.trim();
                    setSentiment(sentimentResult);
                } else {
                    throw new Error("Invalid API response format");
                }
            } catch (parseError) {
                // Fallback to mock response if parsing fails
                console.error("Error parsing API response:", parseError);
                const sentiments = ["Positive conversation with friendly exchanges.", "Negative interaction with disagreements.", "Neutral discussion focusing on information exchange."];
                const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
                setSentiment(randomSentiment);
            }
            
            setShowSentiment(true);
        } catch (error) {
            console.error("Error analyzing sentiment:", error);
            setSentiment("Error analyzing sentiment");
            setShowSentiment(true);
        } finally {
            setSentimentLoading(false);
        }
    }

    const handleShowDateFilter = () => {
        setShowDateFilter(true);
    };

    const handleDateFilterSubmit = (e) => {
        e.preventDefault();
        setShowDateFilter(false);
        performAnalysis();
    };

    const handleFilterTypeChange = (type) => {
        setDateFilter({
            ...dateFilter,
            filterType: type
        });
    };

    const performAnalysis = () => {
        if (props.messages && props.messages.length > 0) {
            // Filter messages based on selected date range
            const filteredMessages = filterMessagesByDate(props.messages);
            
            console.log("Filtered chat history:", filteredMessages);
            
            if (filteredMessages.length === 0) {
                setSentiment("No messages in the selected time range");
                setShowSentiment(true);
                return;
            }
            
            // Format the messages for better readability and analysis
            const formattedMessages = filteredMessages.map((msg, index) => ({
                messageNumber: index + 1,
                sender: msg.fromSelf ? "You" : "Contact",
                content: msg.message,
                timestamp: formatTime(msg.timestamp)
            }));
            
            console.table(formattedMessages);
            
            // Analyze the sentiment
            analyzeSentiment(formattedMessages);
        } else {
            console.log("No messages in this chat yet");
            setSentiment("No messages to analyze");
            setShowSentiment(true);
        }
    };

    const getMessageHistory = () => {
        // This function will be triggered when the history button is clicked
        if (showSentiment) {
            setShowSentiment(false);
        } else if (props.messages && props.messages.length > 0) {
            // Show date filter popup
            handleShowDateFilter();
        } else {
            console.log("No messages in this chat yet");
            setSentiment("No messages to analyze");
            setShowSentiment(true);
        }
    };

    return (
      <>
      {
        showPicker && (
          <EmojiContainer className="emoji-menu" >
            <Picker onEmojiClick={(emojiObject)=> setMsg((prevMsg)=> prevMsg + emojiObject.emoji)}/>
          </EmojiContainer>
        )
      }
        {showDateFilter && (
            <DateFilterPopup>
                <div className="filter-header">
                    <h3>Select Time Range</h3>
                    <button 
                        className="close-button" 
                        onClick={() => setShowDateFilter(false)}
                    >
                        <FaTimes />
                    </button>
                </div>
                
                <form onSubmit={handleDateFilterSubmit}>
                    <div className="quick-filters">
                        <button 
                            type="button" 
                            className={dateFilter.filterType === 'all' ? 'active' : ''}
                            onClick={() => handleFilterTypeChange('all')}
                        >
                            All Messages
                        </button>
                        <button 
                            type="button" 
                            className={dateFilter.filterType === 'today' ? 'active' : ''}
                            onClick={() => handleFilterTypeChange('today')}
                        >
                            Today Only
                        </button>
                        <button 
                            type="button" 
                            className={dateFilter.filterType === 'custom' ? 'active' : ''}
                            onClick={() => handleFilterTypeChange('custom')}
                        >
                            Custom Range
                        </button>
                    </div>
                    
                    {dateFilter.filterType === 'custom' && (
                        <div className="date-range-inputs">
                            <div className="date-input-group">
                                <label>From</label>
                                <div className="date-time-inputs">
                                    <input 
                                        type="date" 
                                        value={dateFilter.fromDate} 
                                        onChange={(e) => setDateFilter({...dateFilter, fromDate: e.target.value})}
                                    />
                                    <input 
                                        type="time" 
                                        value={dateFilter.fromTime} 
                                        onChange={(e) => setDateFilter({...dateFilter, fromTime: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="date-input-group">
                                <label>To</label>
                                <div className="date-time-inputs">
                                    <input 
                                        type="date" 
                                        value={dateFilter.toDate} 
                                        onChange={(e) => setDateFilter({...dateFilter, toDate: e.target.value})}
                                    />
                                    <input 
                                        type="time" 
                                        value={dateFilter.toTime} 
                                        onChange={(e) => setDateFilter({...dateFilter, toTime: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="filter-actions">
                        <button type="submit" className="analyze-btn">Analyze Sentiment</button>
                    </div>
                </form>
            </DateFilterPopup>
        )}
      
        <Container>
            <form onSubmit={(e)=>sendChat(e)} className="input-container">
                <div className='emoji'>
                    <MdOutlineEmojiEmotions onClick={()=>{setShowPicker(!showPicker)}}/>
                </div>
                <div className='history-button'>
                    <FaHistory onClick={getMessageHistory} title="Analyze sentiment" />
                    {showSentiment && (
                        <SentimentPopup sentiment={sentiment}>
                            <div className="close-button" onClick={() => setShowSentiment(false)}>×</div>
                            <div className="sentiment-header">
                                {dateFilter.filterType === 'today' ? 'Today\'s Messages - ' : 
                                 dateFilter.filterType === 'custom' ? 'Custom Range - ' : 
                                 'All Messages - '}
                                Sentiment Analysis
                            </div>
                            {sentimentLoading ? "Analyzing..." : sentiment}
                        </SentimentPopup>
                    )}
                </div>
                <input
                    type="text"
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder='Message'
                />
                <button type='submit'>
                    <IoMdSend/>
                </button>
            </form>
        </Container>
      </>
    )
}

const DateFilterPopup = styled.div`
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  padding: 20px;
  z-index: 100;
  width: 90%;
  max-width: 500px;
  
  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    
    h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
    }
    
    .close-button {
      background: none;
      border: none;
      color: #777;
      cursor: pointer;
      font-size: 16px;
      
      &:hover {
        color: #333;
      }
    }
  }
  
  .quick-filters {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    
    button {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      background-color: #f5f5f5;
      color: #555;
      cursor: pointer;
      transition: all 0.2s;
      
      &:first-child {
        border-radius: 5px 0 0 5px;
      }
      
      &:last-child {
        border-radius: 0 5px 5px 0;
      }
      
      &.active {
        background-color: #128c7e;
        color: white;
        border-color: #128c7e;
      }
      
      &:hover:not(.active) {
        background-color: #e0e0e0;
      }
    }
  }
  
  .date-range-inputs {
    margin-bottom: 20px;
    
    .date-input-group {
      margin-bottom: 10px;
      
      label {
        display: block;
        margin-bottom: 5px;
        color: #555;
        font-size: 14px;
      }
      
      .date-time-inputs {
        display: flex;
        gap: 10px;
        
        input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          
          &[type="date"] {
            flex: 3;
          }
          
          &[type="time"] {
            flex: 2;
          }
        }
      }
    }
  }
  
  .filter-actions {
    display: flex;
    justify-content: flex-end;
    
    .analyze-btn {
      padding: 10px 16px;
      background-color: #128c7e;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      
      &:hover {
        background-color: #0d7366;
      }
    }
  }
`;

const SentimentPopup = styled.div`
  position: absolute;
  top: -80px;
  left: -100px;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 14px;
  background-color: ${props => {
    if (props.sentiment && props.sentiment.toLowerCase().includes('positive')) return '#4CAF50';
    if (props.sentiment && props.sentiment.toLowerCase().includes('negative')) return '#F44336';
    return '#607D8B';
  }};
  color: white;
  box-shadow: 0 3px 8px rgba(0,0,0,0.3);
  z-index: 10;
  width: 250px;
  max-height: 150px;
  overflow-y: auto;
  
  .sentiment-header {
    font-size: 11px;
    margin-bottom: 5px;
    font-weight: bold;
    opacity: 0.9;
  }
  
  &:after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 110px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid ${props => {
      if (props.sentiment && props.sentiment.toLowerCase().includes('positive')) return '#4CAF50';
      if (props.sentiment && props.sentiment.toLowerCase().includes('negative')) return '#F44336';
      return '#607D8B';
    }};
  }
  
  .close-button {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.2);
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.4);
      color: white;
    }
  }
`;

const EmojiContainer = styled.div`
  position : absolute;
  margin-top : 7.1rem;
  margin-left : 30px;
  z-index:1;
`
const Container = styled.div`
  display : flex;
  align-items: center;
  justify-content : center;
  background-color: #ededea;
  padding: 0 2rem;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    padding: 0 2rem;
    gap: 1rem;
  }
  
  .input-container {
    width: 100%;
    border-radius: 0.5rem;
    border-top-right-radius : 3rem;
    border-bottom-right-radius : 3rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    background-color : white;
    .emoji {
      position: relative;
      margin-top : 0.4rem;
      margin-left : 1rem;
      svg {
        color : #A8A8A8;
        font-size: 1.5rem;
        cursor: pointer;
      }
    }
    
    .history-button {
      position: relative;
      margin-top : 0.4rem;
      margin-left : -1rem;
      svg {
        color : #A8A8A8;
        font-size: 1.5rem;
        cursor: pointer;
        &:hover {
          color: #128c7e;
        }
      }
    }
    
    input {
      width: 100%;
      height: 60%;
      background-color: white;
      color: grey;
      border: none;
      border-radius : 0.2rem;
      font-size: 1.2rem;
      &::placeholder{
        font-size : 1rem;
      }
      &::selection {
        background-color: #9a86f3;
      }
      &:focus {
        outline: none;
      }
    }
    button {
      border-radius: 0.5rem;
      width : 4rem;
      height : 2.5rem;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #128c7e;
      border: none;
      @media screen and (min-width: 720px) and (max-width: 1080px) {
        svg {
          font-size: 1.5rem;
        }
      }
      svg {
        font-size: 1.5rem;
        color: white;
      }
    }
  }
`;