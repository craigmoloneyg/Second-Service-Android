const assert=require('node:assert/strict');const {isApp,isInternal,APP_ORIGIN}=require('./navigation.cjs');
assert(isApp(APP_ORIGIN+'/workspace'));
for(const url of ['https://chatgpt.com/auth/login','https://auth.openai.com/authorize','https://accounts.google.com/o/oauth2/auth',APP_ORIGIN+'/callback?code=test']) assert(isInternal(url),url);
for(const url of ['http://auth.openai.com','https://auth.openai.com.evil.example','https://auth.openai.com@evil.example','https://auth.openai.com:8443','javascript:alert(1)','file:///secret']) assert(!isInternal(url),url);
assert(!isApp('https://auth.openai.com/authorize'));
console.log('App, callback and authentication navigation checks passed');
