import APP_HOST from "../configs/envVariables";
//auth routes : 
export const registerRoute = `${APP_HOST}/api/auth/register`
export const loginRoute = `${APP_HOST}/api/auth/login`
export const logoutRoute = `${APP_HOST}/api/auth/logout`;
export const setAvatarRoute = `${APP_HOST}/api/auth/setavatar`;

export const allUsersRoute = `${APP_HOST}/api/auth/allusers`

//message routes :
export const sendMessageRoute = `${APP_HOST}/api/messages/addmessage`
export const getMessageRoute = `${APP_HOST}/api/messages/getmessage`
export const deleteMessageRoute = `${APP_HOST}/api/messages/deletemessage`; // Added new delete route


//cloud routes : 
export const uploadMedia = `${APP_HOST}/api/cloud/upload`
