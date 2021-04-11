## seneca-vote

A voting plugin for Seneca.js

## Actions

* [Upvote Action](#upvote-action)  
* [Downvote Action](#downvote-action)  
* [Open Poll Action](#open-poll-action)  
* [Get Poll Action](#get-poll-action)  


## Action Descriptions

### Upvote Action

#### Pattern

`sys:vote,vote:up`

#### Params

- _fields.poll_id__ : ID! : The ID of the poll to upvote on.
- _fields.voter_id__ : ID! : The ID of the voter.
- _fields.voter_type__ : "sys/user"! : The type of the voter. Currently only "sys/user" is supported.

#### Description

Creates an upvote for a poll. If the voter has already downvoted on the poll,  
the downvote will be replaced by an upvote. On success, the number of upvotes  
and downvotes are counted and included in the response.

#### Responses

Upon successful upvote:
```js
{ status: "success", data: { num_upvotes: Int!, num_downvotes: Int! } }
```

Upon failed validation of the request params:
```js
{ status: "failed", error: { message: String? } }
```

When the poll does not exist:
```js
{ status: "failed", error: { message: String? } }
```

### Downvote Action

#### Pattern
`sys:vote,vote:down`

#### Params
- _fields.poll_id__ : ID! : The ID of the poll to upvote on.
- _fields.voter_id__ : ID! : The ID of the voter.
- _fields.voter_type__ : "sys/user"! : The type of the voter. Currently only "sys/user" is supported. 

#### Description

Creates an downvote for a poll. If the voter has already upvoted on the poll,  
the upvote will be replaced by a downvote. On success, the number of upvotes  
and downvotes are counted and included in the response.

#### Responses

Upon successful downvote:
```js
{ status: "success", data: { num_upvotes: Int!, num_downvotes: Int! } }
```

Upon failed validation of the request params:
```js
{ status: "failed", error: { message: String? } }
```

When the poll does not exist:
```js
{ status: "failed", error: { message: String? } }
```


### Open Poll Action

#### Pattern
`sys:vote,open:poll`

#### Params
- _fields.title__ : string! : The title of the poll.

#### Description

Creates a new poll with the given title. If a poll with the given title already exists,  
then action will nontheless succeed, but a new poll will not be created. On success,  
the poll data is returned.  

#### Responses

Upon success:
```js
{
  status: "success",
  
  data: {
    poll: {
      id: ID!,
      title: String!,
      created_at: Date!,
      updated_at: Date?
    }
  }
}
```

Upon failed validation of the request params:
```js
{ status: "failed", error: { message: String? } }
```

### Get Poll Action

#### Pattern
`sys:vote,get:poll`

#### Params
- _poll_id__ : ID! : The ID of the poll to get.

#### Description
Upon success, returns the poll data. Returns an error message if the poll with  
the given ID does not exist.

#### Responses
Upon success:
```js
{
  status: "success",
  
  data: {
    poll: {
      id: ID!,
      title: String!,
      created_at: Date!,
      updated_at: Date?
    }
  }
}
```

Upon failed validation of the request params:
```js
{ status: "failed", error: { message: String? } }
```

When the poll does not exist:
```js
{ status: "failed", error: { message: String? } }
```
