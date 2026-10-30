// TEST ONLY physical HTTPS mock; production helper/consumers stay unchanged.
import https from 'node:https'
import {EventEmitter} from 'node:events'
export function mockFcfOwnsite(t,{body,status=()=>200,onRequest=()=>{},error=()=>false}){const calls=[];t.mock.method(https,'get',(url,options,callback)=>{const req=new EventEmitter();req.setTimeout=()=>{};req.destroy=()=>{};calls.push({url,options});onRequest(url,options);queueMicrotask(()=>{if(error()){req.emit('error',Object.assign(Error('TEST EPIPE'),{code:'EPIPE'}));return}const response=new EventEmitter();response.statusCode=status();response.destroy=()=>{};callback(response);queueMicrotask(()=>{response.emit('data',Buffer.from(body()));response.emit('end')})});return req});return calls}
