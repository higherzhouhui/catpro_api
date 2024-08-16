const oauth = require('oauth')

const GoauthConsumer = new oauth.OAuth(
  'https://twitter.com/oauth/request_token',
  'https://twitter.com/oauth/access_token',
  'R6TKnjtVMqXQlAfaRI9Eoogg9',
  'ZOi36Wl87O7TUwe84lQIO8X5SlI5UY6Wn30X3RGf7ado1WhtVH',
  '1.0A',
  'https://api.forkfrenpet.com/twitter/callback',
  'HMAC-SHA1'
)

const tw_oauth = new oauth.OAuth(
  'https://twitter.com/oauth/request_token',
  'https://twitter.com/oauth/access_token',
  'R6TKnjtVMqXQlAfaRI9Eoogg9',
  'ZOi36Wl87O7TUwe84lQIO8X5SlI5UY6Wn30X3RGf7ado1WhtVH',
  '1.0A',
  'https://api.forkfrenpet.com/twitter/callback',
  'HMAC-SHA1'
)
// 官方使用授权
async function getG_OAuthRequestToken() {
  return new Promise((resolve, reject) => {
    tw_oauth.getOAuthRequestToken(function (
      error,
      oauthRequestToken,
      oauthRequestTokenSecret,
      results
    ) {
      return error
        ? reject(new Error('Error getting OAuth request token'))
        : resolve({ oauthRequestToken, oauthRequestTokenSecret, results })
    })
  })
}

// twitter 授权
async function twitterOauth() {
  return new Promise((resolve, reject) => {
    tw_oauth.getOAuthRequestToken(function (
      error,
      oauthRequestToken,
      oauthRequestTokenSecret,
      results
    ) {
      return error
        ? reject(new Error('Error getting OAuth request token'))
        : resolve({ oauthRequestToken, oauthRequestTokenSecret, results })
    })
  })
}

getG_OAuthRequestToken()
  .then((result) => {
    console.log(result)
  })
  .catch((err) => {
    console.log(err)
  })

get_twitter_accesstoken(
  'B6rdFQAAAAAA5hCUAAABjhbsPdw',
  '7Bpawuc9OYSe9E1dwQK83NQzVqddMOCq',
  'RCvUOxDwGSYGKAFMyYaHACei0czpzyKT'
)
  .then((res) => {
    console.log('res:', res)
  })
  .catch((error) => {
    console.log('ddd', error)
  })
