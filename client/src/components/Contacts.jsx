

import React, { useEffect, useState } from 'react'
import {IoPersonCircle} from "react-icons/io5"
import Logout from './Logout';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import axios from "axios";
import { getMessageRoute } from "../utils/APIroute";

import styled from "styled-components";

export default function Contacts(props) {
    const {contacts, currentUser, changeChat} = props;
    const [currentUserName, setCurrentUserName] = useState();
    const [currentSelected, setCurrentSelected] = useState();
    const [activeTab, setActiveTab] = useState("chats"); // "chats" or "allContacts"
    const [chatContacts, setChatContacts] = useState([]);
    const [allContacts, setAllContacts] = useState([]);

    console.log(contacts);
    useEffect(()=>{
        if(currentUser){
            setCurrentUserName(currentUser.username);
        }
    },[currentUser])

    const [messageHistory, setMessageHistory] = useState({});

    // Fetch message history for all contacts to determine who has chat history
    useEffect(() => {
        const fetchMessageHistory = async () => {
            if (contacts && contacts.length > 0 && currentUser) {
                const user = await JSON.parse(localStorage.getItem('chat-app-user'));
                
                // Create a map to store which contacts have messages
                const chatHistoryMap = {};
                
                // Check message history for each contact
                for (const contact of contacts) {
                    try {
                        const response = await axios.post(getMessageRoute, {
                            from: user._id,
                            to: contact._id
                        });
                        
                        // If there are messages, mark this contact as having chat history
                        chatHistoryMap[contact._id] = response.data.length > 0;
                    } catch (error) {
                        console.error(`Error fetching messages for contact ${contact._id}:`, error);
                        chatHistoryMap[contact._id] = false;
                    }
                }
                
                setMessageHistory(chatHistoryMap);
            }
        };
        
        fetchMessageHistory();
    }, [contacts, currentUser]);
    
    // Filter contacts based on message history
    useEffect(() => {
        if (contacts && Object.keys(messageHistory).length > 0) {
            // Filter contacts to those who have message history
            const withChats = contacts.filter(contact => messageHistory[contact._id]);
            setChatContacts(withChats);
            setAllContacts(contacts);
        } else {
            setAllContacts(contacts);
        }
    }, [contacts, messageHistory]);

    const changeCurrentChat = (index, contact)=>{
        setCurrentSelected(index)
        changeChat(contact)
    }

    return (
        <>
        {currentUserName && (
          <Container>
            <div className='contact-header'>
              <div className="current-user">
                  <div className="avatar">
                      {
                        currentUser.avatarImage ? 
                        (<img src={currentUser.avatarImage} alt=""/>) : 
                        (<IoPersonCircle/>)
                      }
                  </div>
                  <div className="username">
                    <h2>{currentUserName}</h2>
                  </div>
              </div>
              <div style={{position:"relative"}}>
                <Logout/>
              </div>
            </div>
            
            <div className="tabs">
              <button 
                className={activeTab === "chats" ? "active" : ""} 
                onClick={() => setActiveTab("chats")}
              >
                Chats
              </button>
              <button 
                className={activeTab === "allContacts" ? "active" : ""} 
                onClick={() => setActiveTab("allContacts")}
              >
                All Contacts
              </button>
            </div>

            <div className="contacts">
              {activeTab === "chats" ? (
                chatContacts.length > 0 ? (
                  chatContacts.map((contact, index) => (
                    <div
                      key={contact._id}
                      className={`contact ${
                        index === currentSelected && activeTab === "chats" ? "selected" : ""
                      }`}
                      onClick={() => changeCurrentChat(index, contact)}
                    >
                      <div className="avatar">
                          {props.loading && (
                              <Skeleton
                                  circle
                                  height="100%"
                                  containerClassName="avatar-skeleton"
                              />
                          )}
                          {
                            contact.avatarImage ? 
                            (<img src={contact.avatarImage} alt=""/>) : 
                            (<IoPersonCircle/>)
                          }
                      </div>
                      <div className="username">
                        {props.loading ? <Skeleton width={70} /> : <h3>{contact.username}</h3>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-contacts">No chats yet</div>
                )
              ) : (
                allContacts.map((contact, index) => (
                  <div
                    key={contact._id}
                    className={`contact ${
                      index === currentSelected && activeTab === "allContacts" ? "selected" : ""
                    }`}
                    onClick={() => changeCurrentChat(index, contact)}
                  >
                    <div className="avatar">
                        {props.loading && (
                            <Skeleton
                                circle
                                height="100%"
                                containerClassName="avatar-skeleton"
                            />
                        )}
                        {
                          contact.avatarImage ? 
                          (<img src={contact.avatarImage} alt=""/>) : 
                          (<IoPersonCircle/>)
                        }
                    </div>
                    <div className="username">
                      {props.loading ? <Skeleton width={70} /> : <h3>{contact.username}</h3>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Container>
        )}
      </>
    )
}
const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 8% 82%;
  overflow: hidden;
  background-color: white;
  .contact-header{
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color : #ededed; 
  }
  .tabs {
    display: flex;
    border-bottom: 1px solid #ddd;
    background-color: #f8f8f8;
    
    button {
      flex: 1;
      padding: 8px;
      background: none;
      border: none;
      cursor: pointer;
      font-weight: 500;
      color: #555;
      transition: all 0.3s ease;
      outline: none;
      
      &.active {
        color: #0084ff;
        border-bottom: 3px solid #0084ff;
        background-color: white;
      }
      
      &:hover:not(.active) {
        background-color: #f0f0f0;
      }
    }
  }
  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .no-contacts {
      margin-top: 20px;
      color: #888;
      font-style: italic;
    }
    .contact {
      background-color: #ffffff34;
      min-height: 3rem;
      cursor: pointer;
      width: 100%;
      padding: 0.4rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: 0.5s ease-in-out;
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
          color: black;
        }
      }
    }
    .selected {
      background-color: lightgrey;
    }
  }

  .current-user {
    background-color: transparent;
    display: flex;
    gap: 1rem;
    padding : 0.5rem;
    align-items: center;
    .avatar {
      img {
        height: 2rem;
        max-inline-size: 100%;
      }
      svg {
        color : #A0A0A0;
        font-size: 3rem;
        cursor: pointer;
      }
    }
    .username {
      h2 {
        color: grey;
      }
    }
    button{
      border: none;
      background: none;
      position : relative;
      margin-left : 100;
    }
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.5rem;
      .username {
        h2 {
          font-size: 1rem;
        }
      }
    }
  }
`;