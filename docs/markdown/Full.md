## My Community Full Documentation

> Current Version: 1.0

### Table of Contnents

- [Intro](#introduction)
- [Swagger Structre](#swagger-api-structure)
- [Authentication](#api-authentication)
- [API Sections](#api-sections)
  - [User](#1-user): the User entity
  - [Authentication](#2-authentication): Authorization and Authentication Process
  - [Contacts](#3-contacts): the Relations between users
  - [Status](#4-status): the Status entity
  - [Media](#5-media): the Media entity
  - [Timeline](#6-timeline): Users Timeline
  - [Notifications](#7-notifications): Users Notifications
  - [Live Video](#8-live-video): Live Streaming
  - [Analytics](#9-analytics): User Data Statics and Analysis
  - [Advertisement](#10-advertisement): the Advertisement Entity
  - [Payment](#11-payment): the Payment Entity
  - [Technical Support](#12-technical-support): Sending Messages to tech support

---

#### Introduction

Welcome to the full referance to the API of My Community Services.
You will need [**Postman**](https://www.getpostman.com/) installed to test api.
There is also an API Collecten you can Import it in your Postman to get the full list of endpoints in your client.
Download it from [here]()

Also Here is some notes:

1. I will use `API_URL` along this documentation to refer to the server ip and port.
2. I will also refer to `TOKEN` as the user token.

Currently, Here is a list of the Variables will be used along documentation.

- `SERVER_IP` = 139.59.137.132
- `SERVER_PORT` = 3000
- `API_PREFIX` = `/api/v1`
- `API_URL` = `http://139.59.137.132:3000/api/v1`
- `SWAGGER_URL` = `http://139.59.137.132:3000/docs/`

#### Swagger API Structure

Swagger is awesome, we use swagger to list all of our endpoints.
All swagger Documentation get generated and updated automaticly and allways reflect the last version of the code.

Every Section in Swagger API is Big Module of Backend Services.

Here is a list of all Sections with Small description:

- User: the User entity
- Authentication: Authorization and Authentication Process
- Contacts: the Relations between users
- Status: the Status entity
- Media: the Media entity
- Timeline: Users Timeline
- Notifications: Users Notifications
- Live Video: Live Streaming
- Analytics: User Data Statics and Analysis
- Advertisement: the Advertisement Entity
- Payment: the Payment Entity
- Technical Support: Sending Messages to tech support
- ~~Debuging: Only For Development~~

also we have the `Models` section, where you can find all the requests and responses structures and data types of each field.

#### API Authentication

In our service, we use Tokens, actually JSON Web Token ([JWT](https://jwt.io/)) to authenticate all users across application.

How it works ?
In Application, you request a mobile verification by entering your mobile number and the service will send you an SMS message with a 6 digit verification code, after this process the user will get the token.

Authentication Token will be sent in Http Headers:

> Authorization: Bearer `TOKEN`

we will discuss authentication more in depth in it's section.

#### API Sections

Every Section of the API will take this structure:

- | Description: ...
- | Swagger Referance: [link](#)
- | Endpoint prefix: `/endpoint-example`
- | Endpoint List

Every Item in the list of endpoints will have this structure

> HTTP_METHOD URL [AUTH | NO_AUTH]

Example: `GET /user/find AUTH`

Followed by Request Example and it's response, also with any `Modles` if avalible.

#### 1. User

- Description: The Biggest part of our service and has a lot of endpoints for everything related to it
- Swagger Referance: [User](http://139.59.137.132:3000/docs/#/User).

- Endpoint prefix: `/user`

##### Endpoint List:

- GET /user/find AUTH

  - Get the user by id
  - `metadata` to get only the important information from that user.
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/get_user_find)

  - Example 1: `/user/find?metadata=true&id=1`

    Response:

    ```json
    {
      "data": {
        "id": 1,
        "mobileNumber": "20123456789",
        "firstName": "Shady",
        "lastName": "Khalifa",
        "country": "Egypt",
        "profileImage": "...",
        "gender": "Male",
        "countryCode": "EG",
        "isActive": true,
        "location": "30.0,30.0",
        "description": null
      }
    }
    ```

  - Example 2: `/user/find?metadata=false&id=1`

    Response:

    ```json
    {
      "data": {
        "roles": ["UPDATE_USER_SELF"],
        "id": 1,
        "createdAt": "2018-10-09T20:09:48",
        "updatedAt": "2018-11-08T12:28:35",
        "username": "20123456789",
        "email": "20123456789",
        "isMobileVerified": true,
        "mobileNumber": "20123456789",
        "profile": {
          "id": 1,
          "createdAt": "2018-10-09T20:09:48.000Z",
          "updatedAt": "2018-10-09T20:22:29.000Z",
          "firstName": "Shady",
          "lastName": "Khalifa",
          "language": "us-en",
          "location": "30.0,30.0",
          "country": "Egypt",
          "countryCode": "EG",
          "countryDialCode": "+20",
          "gender": "Male",
          "birthdate": "1998-04-26",
          "description": null,
          "education": "...",
          "jobTitle": "Developer",
          "facebookLink": "hex.inc",
          "verified": false,
          "isActive": true,
          "lastLogin": "2018-10-09",
          "profileImage": "..."
        }
      }
    }
    ```

- GET /user/find/mobile NO_AUTH

  - Get the user information by mobile number
  - `metadata` same as `/user/find`
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/get_user_find_mobile)

  - Example 1: `user/find/mobile?metadata=false&number=20123456789`

    Response: same as example above

  - Example 2: `user/find/mobile?metadata=true&number=20123456789`

    Response: same as example above

- POST /user/verify/request NO_AUTH

  - The First Step in creating new user.
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/post_user_verify_request)
  - Request

  ```json
  {
    "mobileNumber": "20123456789"
  }
  ```

  - Response:

  ```json
  {
    "requestId": "cb2244e84398c13eabf287b00893747a",
    "mobileNumber": "20123456789",
    "message": "Message Sent",
    "statusCode": 200
  }
  ```

- POST /user/verify/code NO_AUTH

  - This the 2nd Step to verify your mobile number.
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/post_user_verify_code)
  - Request:

  ```json
  {
    "code": "123456",
    "mobileNumber": "20123456789",
    "requestId": "cb2244e84398c13eabf287b00893747a"
  }
  ```

  - Response:

  ```json
  {
    "data": {
      "requestId": "cb2244e84398c13eabf287b00893747a",
      "message": "Verified",
      "statusCode": 200
    }
  }
  ```

- POST /user/create NO_AUTH

  - Create New User
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/post_user_create)
  - Data:

  ```json
  {
    "requestId": "cb2244e84398c13eabf287b00893747a",
    "photoId": "12",
    "mobileNumber": "20123456789",
    "user": {
      "email": "20123456789"
    },
    "profile": {
      "firstName": "Test",
      "lastName": "User",
      "language": "en-us",
      "location": "32.0,32.0",
      "country": "Egypt",
      "countryCode": "EG",
      "countryDialCode": "20",
      "gender": "male",
      "birthdate": "1998-04-26",
      "description": "test",
      "education": "test",
      "jobTitle": "test",
      "facebookLink": "fb.com"
    }
  }
  ```

  - Response:

  ```json
  {
    "data": {
      "token": "...TOKEN...",
      "id": 1,
      "message": "User Created",
      "statusCode": 201
    }
  }
  ```

- POST /user/update AUTH

  - Update User Information
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/post_user_update)
  - Data:

  ```json
  {
    "user": {
      "email": "20123456789"
    },
    "profile": {
      "firstName": "Test",
      "lastName": "User Updated",
      "language": "en-us",
      "location": "32.0,32.0",
      "country": "Egypt",
      "countryCode": "EG",
      "countryDialCode": "20",
      "gender": "male",
      "birthdate": "1998-04-26",
      "description": "test",
      "education": "test",
      "jobTitle": "test",
      "facebookLink": "fb.com"
    }
  }
  ```

  - Response:

  ```json
  {
    "data": {
      "token": "...TOKEN...",
      "id": 1,
      "message": "User Updated",
      "statusCode": 201
    }
  }
  ```

- POST /user/update/profile-pic AUTH

  - Update User Profile Picture
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/post_user_update_profile_pic)
  - Data:

  ```json
  {
    "photoId": "120"
  }
  ```

  - Response:

  ```json
  {
    "message": "Profile Photo Updated",
    "statusCode": 201
  }
  ```

- POST /user/update/device-token AUTH

  - Update User Firebase (Device Token) or set it if it's not exist.
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/post_user_update_device_token)
  - Data:

  ```json
  {
    "deviceToken": "cb2244e84398c13eabf287b00893747a5a2257d189286e0b104ae4e56893132f"
  }
  ```

  - Response:

  ```json
  {
    "message": "Device Token Updated",
    "statusCode": 201
  }
  ```

- GET /user/me/privacy/list AUTH

  - get the user block list
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/get_user_me_privacy_list)
  - Response:

  ```json
  {
    "data": [
      {
        "other": {
          "id": 32,
          "mobileNumber": "9663123213123",
          "firstName": "Some",
          "lastName": "Bad User",
          "country": "+966",
          "profileImage": "...",
          "gender": "Male",
          "countryCode": "",
          "isActive": true,
          "location": "18.30313487,42.70303327",
          "description": "null"
        },
        "type": "CHAT_ONLY"
      }
    ]
  }
  ```

- POST /user/me/privacy/add AUTH

  - Block User
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/get_user_me_privacy_add)
  - Request

  ```json
  {
    "userId": "12",
    "type": "all"
  }
  ```

  - Response

  ```json
  {
    "data": {
      "me": {
        "roles": ["UPDATE_USER_SELF"],
        "id": 1,
        "createdAt": "2018-10-09T20:09:48.000Z",
        "updatedAt": "2018-11-08T12:28:35.000Z",
        "username": "20123456789",
        "email": "20123456789",
        "isMobileVerified": true,
        "mobileNumber": "20123456789",
        "profile": {
          "id": 1,
          "createdAt": "2018-10-09T20:09:48.000Z",
          "updatedAt": "2018-10-09T20:22:29.000Z",
          "firstName": "...",
          "lastName": "...",
          "language": "us-en",
          "location": "30.0,30.0",
          "country": "Egypt",
          "countryCode": "EG",
          "countryDialCode": "+20",
          "gender": "Male",
          "birthdate": "1998-04-26",
          "description": null,
          "education": "Eng.",
          "jobTitle": "Developer",
          "facebookLink": "hex.inc",
          "verified": false,
          "isActive": true,
          "lastLogin": "2018-10-09",
          "profileImage": "..."
        }
      },
      "other": {
        "roles": ["UPDATE_USER_SELF"],
        "id": 32,
        "createdAt": "2019-02-04T13:26:34.000Z",
        "updatedAt": "2019-02-04T13:26:34.000Z",
        "username": "966546416736",
        "email": "...",
        "isMobileVerified": true,
        "mobileNumber": "966546416736",
        "profile": {
          "id": 33,
          "createdAt": "2019-02-04T13:26:34.000Z",
          "updatedAt": "2019-02-04T13:26:34.000Z",
          "firstName": "....",
          "lastName": "...",
          "language": "us-en",
          "location": "18.30313487,42.70303327",
          "country": "Saudi Arabia",
          "countryCode": "",
          "countryDialCode": "+20",
          "gender": "Male",
          "birthdate": "2019-02-04",
          "description": "null",
          "education": "null",
          "jobTitle": "null",
          "facebookLink": "null",
          "verified": false,
          "isActive": true,
          "lastLogin": "2019-02-04",
          "profileImage": "..."
        }
      },
      "type": 0,
      "id": 16,
      "createdAt": "2019-02-05T13:43:46",
      "updatedAt": "2019-02-05T13:43:46"
    }
  }
  ```

- POST /user/me/privacy/update AUTH

  - Update some preivcy User
  - See [Swagger](http://139.59.137.132:3000/docs/#/User/get_user_me_privacy_update)
  - Same as Add (see above).

> // TODO: Add newily added endpoints.

---

#### 2. Authentication

- Description: The Centeral Part of Authentication & Authorization.
- Swagger Referance: [Authentication](http://139.59.137.132:3000/docs/#/Authentication).

- Endpoint prefix: `/user`

##### Endpoint List:

- POST /auth/login NO_AUTH

  - Login By Mobile Number.
  - See [Swagger](http://139.59.137.132:3000/docs/#/Authentication/post_auth_login).
  - Request:

  ```json
  {
    "mobileNumber": "20123456789"
  }
  ```

  - Response:

  ```json
  {
    "requestId": "cb2244e84398c13eabf287b00893747a",
    "mobileNumber": "20123456789",
    "message": "Message Sent",
    "statusCode": 200
  }
  ```

  You will recive a sms on your mobile you need to verify it to get the token.

- POST /auth/login/verify NO_AUTH

  - Get the token by verifing the login process
  - See [Swagger](http://139.59.137.132:3000/docs/#/Authentication/post_auth_login_verify).
  - Request:

  ```json
  {
    "code": "123456",
    "mobileNumber": "20123456789",
    "requestId": "cb2244e84398c13eabf287b00893747a"
  }
  ```

  - Response:

  ```json
  {
    "data": {
      "token": "...TOKEN...",
      "id": 1,
      "message": "User LoggedIn",
      "statusCode": 200
    }
  }
  ```

---

#### 3. Contacts

- Description: The Relations between users.
- Swagger Referance: [Contacts](http://139.59.137.132:3000/docs/#/Contacts).

- Endpoint prefix: `/user/contacts`

##### Endpoint List:

- POST /user/contacts/upload AUTH

  - Upload User Contacts
  - See [Swagger](http://139.59.137.132:3000/docs/#/Contacts/post_user_contacts_upload)
  - Request

  ```json
  {
    "data": [
      {
        "mobileNumber": "20123456789",
        "contactName": "Jon Doe"
      },
      {
        "mobileNumber": "20123456780",
        "contactName": "Will Smith"
      }
    ]
  }
  ```

  - Response:

  ```json
  {
    "message": "Contacts Saved",
    "statusCode": 200
  }
  ```

- POST /user/contacts/add AUTH

  - Upload a single contact
  - See [Swagger](http://139.59.137.132:3000/docs/#/Contacts/post_user_contacts_add)
  - Request

  ```json
  {
    "mobileNumber": "20123456789",
    "contactName": "Jon Doe"
  }
  ```

  - Response:

  ```json
  {
    "message": "Contacts Saved",
    "statusCode": 200
  }
  ```

- DELETE /user/contacts/remove AUTH

  - Remove a single contact
  - See [Swagger](http://139.59.137.132:3000/docs/#/Contacts/post_user_contacts_remove)
  - Request

  ```json
  {
    "mobileNumber": "20123456789",
    "contactName": "Jon Doe"
  }
  ```

  - Response:

  ```json
  {
    "message": "Contact Removed",
    "statusCode": 200
  }
  ```

- POST /user/contacts/update AUTH

  - update a single contact
  - See [Swagger](http://139.59.137.132:3000/docs/#/Contacts/post_user_contacts_update)
  - Request

  ```json
  {
    "mobileNumber": "20123456789",
    "contactName": "Jon Doe"
  }
  ```

  - Response:

  ```json
  {
    "message": "Contact Updated",
    "statusCode": 200
  }
  ```

- POST /user/contacts/favourite AUTH

  - favourite a single contact
  - See [Swagger](http://139.59.137.132:3000/docs/#/Contacts/post_user_contacts_favourite)
  - Request

  ```json
  {
    "mobileNumber": "20123456789",
    "contactName": "Jon Doe"
  }
  ```

  - Response:

  ```json
  {
    "message": "Contact Updated",
    "statusCode": 200
  }
  ```

- POST /user/contacts/unfavourite AUTH

  - unfavourite a single contact
  - See [Swagger](http://139.59.137.132:3000/docs/#/Contacts/post_user_contacts_unfavourite)
  - Request

  ```json
  {
    "mobileNumber": "20123456789",
    "contactName": "Jon Doe"
  }
  ```

  - Response:

  ```json
  {
    "message": "Contact Updated",
    "statusCode": 200
  }
  ```

- GET /user/contacts/list AUTH

  - get all user contacts
  - See [Swagger](http://139.59.137.132:3000/docs/#/Contacts/get_user_contacts_list)
  - Response:

  ```json
  {
    "data": [
      {
        "mobileNumber": "201123123213",
        "isFavourite": false,
        "contactName": "Someone",
        "isUser": false,
        "userId": null
      },
      {
        "user": {
          "id": 18,
          "mobileNumber": "2012321321312",
          "firstName": "Some",
          "lastName": "one",
          "country": "Saudi Arabia",
          "profileImage": "...",
          "gender": "Male",
          "countryCode": "SA",
          "isActive": true,
          "location": "18.334027499999983,42.654597656250004",
          "description": null
        },
        "mobileNumber": "2012321321312",
        "isFavourite": false,
        "contactName": "Someone",
        "isUser": true,
        "userId": "18"
      }
    ]
  }
  ```

- GET /user/friends/list AUTH
  - get your friends list, contacts that only has a users
  - See [Swagger](http://139.59.137.132:3000/docs/#/Contacts/get_user_friends_list)
  - `favouritedOnly` set it to true to get only your favourite ones.
  - Response:
  ```json
  {
    "data": [
      {
        "user": {
          "id": 18,
          "mobileNumber": "2012321321312",
          "firstName": "Some",
          "lastName": "one",
          "country": "Saudi Arabia",
          "profileImage": "...",
          "gender": "Male",
          "countryCode": "SA",
          "isActive": true,
          "location": "18.334027499999983,42.654597656250004",
          "description": null
        },
        "mobileNumber": "2012321321312",
        "isFavourite": false,
        "contactName": "Someone",
        "isUser": true,
        "userId": "18"
      }
    ]
  }
  ```

> // TODO: add other friends endpoints here.

---

#### 4. Status

- Description: The Most part of our application, user statuses.
- Swagger Referance: [Status](http://139.59.137.132:3000/docs/#/Status).

##### Endpoint List:

- POST /user/me/status/create AUTH

  - Create new status
  - See [Swagger](http://139.59.137.132:3000/docs/#/Status/post_user_me_status_create)
  - Note, See CreateStatusDTO in the Swagger API, it has a lot of docs in it.
  - Request

  ```json
  {
    "text": "Hello World",
    "isReply": false,
    "isShare": false,
    "hideOriginalStatusOwner": false,
    "isLive": false,
    "isPublicGlobal": false,
    "isGeoEnabled": true,
    "hasPrivacy": false,
    "inReplyToStatusId": "",
    "channelId": "",
    "stars": 0,
    "locationName": "Egypt",
    "shareToStatusId": "",
    "coordinates": "30.131,30.123",
    "hasMedia": false,
    "mediaIds": [""],
    "mentions": [],
    "mediaType": "photo",
    "privacy": "public",
    "type": "status"
  }
  ```

  - Response

  ```json
  {
    "data": {
      "createdAt": "2019-02-05T14:38:45",
      "id": 1144,
      "media": [],
      "mentions": []
    }
  }
  ```

  - Request

  ```json
  {
    "text": "Hello World with media",
    "isReply": false,
    "isShare": false,
    "hideOriginalStatusOwner": false,
    "isLive": false,
    "isPublicGlobal": false,
    "isGeoEnabled": true,
    "hasPrivacy": false,
    "inReplyToStatusId": "",
    "channelId": "",
    "stars": 0,
    "locationName": "Egypt",
    "shareToStatusId": "",
    "coordinates": "30.131,30.123",
    "hasMedia": true,
    "mediaIds": ["26"],
    "mentions": [],
    "mediaType": "photo",
    "privacy": "public",
    "type": "status"
  }
  ```

  - Response

  ```json
  {
    "data": {
      "createdAt": "2019-02-05T14:38:45",
      "id": 1144,
      "media": [
        {
          "id": 26,
          "url": "...",
          "type": "photo",
          "duration": "",
          "thumbnails": null,
          "mediaHash": ""
        }
      ],
      "mentions": []
    }
  }
  ```

- DELETE /user/me/status AUTH

  - Delete a status by id
  - `id` is the status id
  - See [Swagger](http://139.59.137.132:3000/docs/#/Status/delete_user_me_status_delete)
  - Response

  ```json
  {
    "data": {
      "statusCode": 200,
      "message": "Status Deleted"
    }
  }
  ```

- GET /user/view/status/{id}/actions AUTH

  - Get status actions by it's id, and with action type.
  - See [Swagger](http://139.59.137.132:3000/docs/#/Status/get_user_view_status__id__actions)
  - Request: user/view/status/1000/actions?page=1&limit=20&type=like
  - Response

  ```json
  {
    "data": [
      {
        "id": 2228,
        "createdAt": "2019-01-26T17:51:01",
        "updatedAt": "2019-01-26T17:51:01",
        "type": 0,
        "user": {
          "roles": ["UPDATE_USER_SELF"],
          "id": 18,
          "createdAt": "2018-11-14T04:55:18.000Z",
          "updatedAt": "2018-11-14T04:55:18.000Z",
          "username": "....",
          "email": "....",
          "isMobileVerified": true,
          "mobileNumber": "....",
          "profile": {
            "id": 19,
            "createdAt": "2018-11-14T04:55:18.000Z",
            "updatedAt": "2018-11-14T04:55:18.000Z",
            "firstName": "...",
            "lastName": "...",
            "language": "us-en",
            "location": "18.334027499999983,42.654597656250004",
            "country": "Saudi Arabia",
            "countryCode": "SA",
            "countryDialCode": "+20",
            "gender": "Male",
            "birthdate": "1988-11-14",
            "description": null,
            "education": "wwwww",
            "jobTitle": "the ",
            "facebookLink": "Facebook ",
            "verified": false,
            "isActive": true,
            "lastLogin": "2018-11-14",
            "profileImage": "..."
          }
        }
      }
    ]
  }
  ```

- GET /user/view/status AUTH

  - View Status by it's id
  - See [Swagger](http://139.59.137.132:3000/docs/#/Status/get_user_view_status)
  - Request: user/view/status?id=501
  - Response

  ```json
  {
    "data": {
      "id": 502,
      "createdAt": "2018-12-11T17:14:40",
      "text": "...",
      "hideOriginalStatusOwner": false,
      "stars": null,
      "locationName": "",
      "coordinates": "0.0,0.0",
      "hasMedia": false,
      "hasPrivacy": true,
      "isShare": false,
      "isPublicGlobal": false,
      "isReply": false,
      "isLive": false,
      "channelId": null,
      "privacy": "public",
      "media": null,
      "mediaHashs": [],
      "mentions": null,
      "type": "status",
      "withUserId": null,
      "deleted": 0,
      "userId": 1,
      "parent": null,
      "originalStatus": null,
      "counters": {
        "likesCount": "1",
        "dislikesCount": "0",
        "sharedCount": "0",
        "commentCount": "0",
        "viewsCount": "4"
      },
      "user": {
        "id": 1,
        "mobileNumber": "....",
        "firstName": "...",
        "lastName": "...",
        "country": "Egypt",
        "profileImage": "....",
        "gender": "Male",
        "countryCode": "EG",
        "isActive": true,
        "location": "30.0,30.0",
        "description": null
      },
      "currentUserAction": {
        "isView": false,
        "isLike": false,
        "isDislike": false
      }
    }
  }
  ```

- POST /user/status/action AUTH
  - Make action to a some status by it's id
  - See [Swagger](http://139.59.137.132:3000/docs/#/Status/post_user_status_action)
  - Request:
  ```json
  {
    "statusId": "501",
    "actionType": "like"
  }
  ```
  - Response:
  ```json
  {
    "data": {
      "message": "Action Created",
      "statusCode": 200,
      "type": "like"
    }
  }
  ```

> // TODO: Add status recommendation.

---

#### 5. Media

- Description: Where all of the users media goes.
- Swagger Referance: [Media](http://139.59.137.132:3000/docs/#/Media).

##### Endpoint List:

- POST /media/upload/photo/base64 NO_AUTH

  - Upload a photo as base64, this only used when creating a user.
  - See [Swagger](http://139.59.137.132:3000/docs/#/Media/post_media_upload_photo_base64).
  - Example:

  ```json
  {
    "image": "......"
  }
  ```

  - Response:

  ```json
  {
    "data": {
      "url": "....",
      "size": 17826,
      "mimetype": "image/jpeg",
      "user": {
        "roles": ["UPDATE_USER_SELF"],
        "id": 1,
        "createdAt": "2018-10-09T20:09:48.000Z",
        "updatedAt": "2018-11-08T12:28:35.000Z",
        "username": "....",
        "email": "....",
        "isMobileVerified": true,
        "mobileNumber": "....",
        "profile": {
          "id": 1,
          "createdAt": "2018-10-09T20:09:48.000Z",
          "updatedAt": "2018-10-09T20:22:29.000Z",
          "firstName": "...",
          "lastName": "...",
          "language": "us-en",
          "location": "30.0,30.0",
          "country": "Egypt",
          "countryCode": "EG",
          "countryDialCode": "+20",
          "gender": "Male",
          "birthdate": "1998-04-26",
          "description": null,
          "education": "Eng.",
          "jobTitle": "Developer",
          "facebookLink": "hex.inc",
          "verified": false,
          "isActive": true,
          "lastLogin": "2018-10-09",
          "profileImage": "...."
        }
      },
      "type": "photo",
      "conversationId": null,
      "thumbnails": null,
      "id": 865,
      "createdAt": "2019-02-05T15:57:17",
      "updatedAt": "2019-02-05T15:57:17",
      "duration": "0",
      "mediaHash": ""
    }
  }
  ```

- POST /media/upload/photos AUTH

  - Upload a photo or multi-photos up to 5 in one request.
  - the field name: `photos`
  - See [Swagger](http://139.59.137.132:3000/docs/#/Media/post_media_upload_photos).
  - Response:

  ```json
  {
    "data": [
      {
        "url": "....",
        "size": 17826,
        "mimetype": "image/jpeg",
        "user": {
          "roles": ["UPDATE_USER_SELF"],
          "id": 1,
          "createdAt": "2018-10-09T20:09:48.000Z",
          "updatedAt": "2018-11-08T12:28:35.000Z",
          "username": "....",
          "email": "....",
          "isMobileVerified": true,
          "mobileNumber": "....",
          "profile": {
            "id": 1,
            "createdAt": "2018-10-09T20:09:48.000Z",
            "updatedAt": "2018-10-09T20:22:29.000Z",
            "firstName": "...",
            "lastName": "...",
            "language": "us-en",
            "location": "30.0,30.0",
            "country": "Egypt",
            "countryCode": "EG",
            "countryDialCode": "+20",
            "gender": "Male",
            "birthdate": "1998-04-26",
            "description": null,
            "education": "Eng.",
            "jobTitle": "Developer",
            "facebookLink": "hex.inc",
            "verified": false,
            "isActive": true,
            "lastLogin": "2018-10-09",
            "profileImage": "...."
          }
        },
        "type": "photo",
        "conversationId": null,
        "thumbnails": null,
        "id": 865,
        "createdAt": "2019-02-05T15:57:17",
        "updatedAt": "2019-02-05T15:57:17",
        "duration": "0",
        "mediaHash": ""
      }
    ]
  }
  ```

- POST /media/upload/clip AUTH

  - Upload a voice clip
  - the field name: `clip`
  - See [Swagger](http://139.59.137.132:3000/docs/#/Media/post_media_upload_clip).
  - Response: Same as above

- POST /media/upload/files AUTH

  - Upload a file
  - the field name: `files`
  - See [Swagger](http://139.59.137.132:3000/docs/#/Media/post_media_upload_files).
  - Response: Same as above

- POST /media/upload/video AUTH

  - Upload a video
  - the field name: `video`
  - See [Swagger](http://139.59.137.132:3000/docs/#/Media/post_media_upload_video).
  - Response: Same as above

- GET /media/show AUTH
  - Show media by id
  - `id` in query param
  - See [Swagger](http://139.59.137.132:3000/docs/#/Media/get_media_show).
  - Request: /media/show?id=20
  - Response:
  ```json
  {
    "data": {
      "id": 20,
      "createdAt": "2018-10-09T19:02:45",
      "updatedAt": "2018-10-09T19:02:45",
      "url": "....",
      "type": "photo",
      "size": 13549,
      "mimetype": "jpeg",
      "duration": "",
      "thumbnails": null,
      "conversationId": null,
      "mediaHash": ""
    }
  }
  ```

> // TODO: add conversation_media

---

#### 6. Timeline

- Description: See what others say !
- Swagger Referance: [Timeline](http://139.59.137.132:3000/docs/#/Timeline).

##### Endpoint List:

- GET /user/home/timeline AUTH

  - get your contacts and friends statuses
  - `lastTime` is param where the last timestamp you updated the timeline. i.e timestamp of last status appers on your timeline. if none, set it to `0` to get them all.
  - See [Swagger](http://139.59.137.132:3000/docs/#/Timeline/get_user_home_timeline).
  - Example: user/home/timeline?page=1&lastTime=0
  - Response:
    the list of statuses was ommited here, but review the `/user/view/status` in [Status](#4-status) section.

  ```json
  {
    "data": [{}, {}, {}]
  }
  ```

- GET /user/home/stories AUTH

  - get your contacts and friends last stories
  - See [Swagger](http://139.59.137.132:3000/docs/#/Timeline/get_user_home_stories).
  - See above for examples.

- GET /user/{id}/timeline AUTH

  - get user timeline, list all statuses from user timeline.
  - See [Swagger](http://139.59.137.132:3000/docs/#/Timeline/get_user__id__timeline).
  - set `mediaOnly` to `ture` to get the media page only.
  - Response: same as home timeline, but for this user only.

- GET /user/{id}/timeline/story AUTH

  - get user story timeline.
  - See [Swagger](http://139.59.137.132:3000/docs/#/Timeline/get_user__id__timeline_story).
  - Response: same as story home timeline, but for this user only.

- GET /user/country/timeline AUTH

  - get timeline from many countries
  - `sortBy` is a function you control to sort posts, options are [likes, comments, views, date]
  - `from` is where you want these statuses come from, for example Egypt, set it to `EG`, you can compine multi countries in one by siprate them by comma i.e `EG,USA`
  - `lastTime` is param where the last timestamp you updated the timeline. i.e timestamp of last status appers on your timeline. if none, set it to `0` to get them all.
  - See [Swagger](http://139.59.137.132:3000/docs/#/Timeline/get_user_country_timeline).
  - Example: user/home/timeline?page=1&lastTime=0
  - Response:
    the list of statuses was ommited here, but review the `/user/view/status` in [Status](#4-status) section.

  ```json
  {
    "data": [{}, {}, {}]
  }
  ```

---

#### 7. Notifications

- Description: For Storing User Notifications on server !
- Swagger Referance: [Notifications](http://139.59.137.132:3000/docs/#/Notifications).

##### Endpoint List:

- POST /notifications/store AUTH

  - Store Notifications on server.
  - See [Swagger](http://139.59.137.132:3000/docs/#/Notifications/post_notifications_store).
  - Request:

  ```json
  {
    "senderId": "1",
    "statusId": "2",
    "statusOwner": "2",
    "statusType": "status",
    "actionType": "like",
    "notificationType": "status",
    "senderProfilePic": "..."
  }
  ```

  - Response:

  ```json
  {
    "data": {
      "_id": "5c59ba0310ab9f0046727127",
      "senderId": "1",
      "statusId": "2",
      "statusOwner": "2",
      "statusType": "status",
      "actionType": "like",
      "notificationType": "status",
      "senderProfilePic": "...",
      "userId": "1",
      "updatedAt": "2019-02-05T16:29:55.238Z",
      "createdAt": "2019-02-05T16:29:55.238Z",
      "__v": 0
    }
  }
  ```

- GET /notifications/store AUTH
  - Sync (download) user notifications.
  - See [Swagger](http://139.59.137.132:3000/docs/#/Notifications/get_notifications_sync).
  - See Models Section, it will help you a lot.
  - Example: notifications/sync?limit=2
  - Response:
  ```json
  {
    "data": [
      {
        "_id": "5c59ba0310ab9f0046727127",
        "senderId": "1",
        "statusId": "....",
        "statusOwner": "2",
        "statusType": "status",
        "actionType": "like",
        "notificationType": "status",
        "senderProfilePic": "...",
        "userId": "1",
        "updatedAt": "2019-02-05T16:29:55.238Z",
        "createdAt": "2019-02-05T16:29:55.238Z",
        "__v": 0
      },
      {
        "_id": "5c59b57410ab9f0046727126",
        "notificationType": "1004",
        "senderId": "...",
        "senderProfilePic": "...",
        "actionType": "1004",
        "statusType": "status",
        "channelId": " ",
        "statusId": "1145",
        "statusOwner": "1",
        "userId": "1",
        "updatedAt": "2019-02-05T16:10:28.134Z",
        "createdAt": "2019-02-05T16:10:28.134Z",
        "__v": 0
      }
    ]
  }
  ```

---

#### 8. Live Video

- Description: For Creating Live streams !
- Swagger Referance: [Live Video](http://139.59.137.132:3000/docs/#/Live_Video).

##### Endpoint List:

- POST /stream/live/reserve AUTH
  - Reserve a new Channel for you
  - See [Swagger](http://139.59.137.132:3000/docs/#/Live%20Video/post_stream_live_reserve).
  - `shouldRecord` if you want to record this video, and save it to the server.
  - Example: /stream/live/reserve?shouldRecord=false
  - Response:
  ```json
  {
    "data": {
      "channelId": "QZ1YZgw4r9VZM37Lkegu4sTjKUE5WxfW",
      "shouldRecord": false,
      "statusCode": 201
    }
  }
  ```

---

#### 9. Analytics

> // TODO: add this

---

#### 10. Advertisement

> // TODO: add this

---

#### 11. Payment

> // TODO: add this

---

#### 12. Technical Support

// TODO: add this.
