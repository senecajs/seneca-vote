## @seneca/vote

A voting plugin for Seneca.js

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Contents:  
- [Requirements](#requirements)
- [Message Handlers](#message-handlers)
- [Dev Scripts](#dev-scripts)

## Requirements

The following Seneca plugins must be plugged in before this plugin
can be used:  
- seneca-entity
- seneca-promisify

Normally, your code would look like this:
```js
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const VotePlugin = require('@seneca/vote')

Seneca()
  .use(Entities)
  .use(SenecaPromisify)
  .use(VotePlugin)
```

## Message Handlers

* [Upvote Action](#upvote-action)  
* [Downvote Action](#downvote-action)  
* [Open Poll Action](#open-poll-action)  
* [Get Poll Action](#get-poll-action)  


## Action Descriptions

### Upvote Action

#### Pattern

`sys:vote,vote:up`

#### Params

- _fields.poll_id__ : ID!  

The ID of the poll to upvote on.

- _fields.voter_id__ : ID!

The ID of the voter.

- _fields.voter_type__ : "sys/user"!

The type of the voter. Currently only "sys/user" is supported.

- _fields.save_poll_rating_to__ : { [k : EntityName!] => ID! }?

Specifies the entity name and the id to denormalize the new poll rating to. Used  
in tandem with the `dependents` plugin option.

#### Description

Creates an upvote for a poll. If the voter has already downvoted on the poll,  
the downvote will be replaced by an upvote. On success, the number of upvotes  
and downvotes are counted and included in the response.

If the `dependents` plugin option is used, the new poll rating will be saved to  
the entity with the given id in the `save_poll_rating_to` argument.   

#### Responses

Upon successful upvote:
```js
{ ok: true, data: { num_upvotes: Int!, num_downvotes: Int! } }
```

Upon failed validation of the request params:
```js
{
  ok: false,
  why: String,
  details?: { path: Array<Any>?, why_exactly: String? }
}
```

When the poll does not exist:
```js
{ ok: false, why: String, details?: { what: String? } }
```

### Downvote Action

#### Pattern
`sys:vote,vote:down`

#### Params
- _fields.poll_id__ : ID!

The ID of the poll to upvote on.

- _fields.voter_id__ : ID!

The ID of the voter.

- _fields.voter_type__ : "sys/user"!

The type of the voter. Currently only "sys/user" is supported. 

- _fields.save_poll_rating_to__ : { [k : EntityName!] => ID! }?

Specifies the entity name and the id to denormalize the new poll rating to. Used  
in tandem with the `dependents` plugin option.


#### Description

Creates an downvote for a poll. If the voter has already upvoted on the poll,  
the upvote will be replaced by a downvote. On success, the number of upvotes  
and downvotes are counted and included in the response.

If the `dependents` plugin option is used, the new poll rating will be saved to  
the entity with the given id in the `save_poll_rating_to` argument.   

#### Responses

Upon successful downvote:
```js
{ status: "success", data: { num_upvotes: Int!, num_downvotes: Int! } }
```

Upon failed validation of the request params:
```js
{
  ok: false,
  why: String,
  details?: { path: Array<Any>?, why_exactly: String? }
}
```

When the poll does not exist:
```js
{ ok: false, why: String, details?: { what: String? } }
```


### Open Poll Action

#### Pattern
`sys:vote,open:poll`

#### Params
- _fields.title__ : string!

The title of the poll.

#### Description

Creates a new poll with the given title. If a poll with the given title already  
exists, then action will nontheless succeed, but a new poll will not be created.  
On success, the poll data is returned.    

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
{
  ok: false,
  why: String,
  details?: { path: Array<Any>?, why_exactly: String? }
}
```

### Get Poll Action

#### Pattern
`sys:vote,get:poll`

#### Params
- _poll_id__ : ID!

The ID of the poll to get.

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
{
  ok: false,
  why: String,
  details?: { path: Array<Any>?, why_exactly: String? }
}
```

When the poll does not exist:
```js
{ ok: false, why: String, details?: { what: String? } }
```

#### Plugin Options
`dependents` - By default, this option is not set. An example of the set option  
would look like this:

```js
seneca.use(SenecaVote, { 
  dependents: {
    'red': {      // <-- this value represents a `kind` of a vote
      'mars': {   // <-- this value represents a `code` of a vote
        totals: {
          'sys/poll': {     // <-- this is the the entity to save the poll rating to
            field: 'rating' // <-- this is the field of the entity to save the poll rating to
          }
        }
      }
    }
  }
})
```

When the option is set, certain message handlers, when receiving a vote  
submission with the `kind` and `code` in the message matching those specified  
in the plugin options, will denormalize (i.e. save) the poll rating. The poll  
rating will be denormalized (i.e. saved) to the field of the entity - both the  
field and the entity specified in the plugin options. The id of the entity that  
the rating will be denormalized to, will have to be passed via the message,  
along with the `kind` and `code`.  

For more information on message handlers that support such denormalization,  
please consult the documentation on the message handlers.  

#### Dev Scripts
`$ npm test`  

Runs the automated tests.  

`$ npm run check-coverage`  

Generates a test coverage report.    

`$ npm run reset`

Sometimes when the project starts acting weird, the first go-to solution may be  
to go ahead and refresh (i.e. reinstall) the packages used in the project. This  
command does just that.

`$ npm run clean`

Normally this command is not meant to be invoked explicitly, and is generally  
meant for consumption by other scripts in the project.  

