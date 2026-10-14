import test from 'node:test';
import assert from 'node:assert/strict';
import {createGithubClient,verifyExistingPages} from '../scripts/github-setup.mjs';

test('an existing Actions-based Pages site is verified without changing its configuration',async()=>{
  const calls:Array<{url:string;method:string}>=[];
  const github=createGithubClient('test-token',async(url,options)=>{
    calls.push({url:String(url),method:options?.method||'GET'});
    return Response.json({build_type:'workflow'});
  });
  await verifyExistingPages(github);
  assert.deepEqual(calls,[{url:'https://api.github.com/repos/Sun-XT9527/personal-blog/pages',method:'GET'}]);
});

test('a missing Pages site offers a setup instruction without requesting broader permissions',async()=>{
  const github=createGithubClient('test-token',async()=>Response.json({message:'Not Found'},{status:404}));
  await assert.rejects(verifyExistingPages(github),/Settings → Pages/);
});

test('a rejected GitHub step is identified and credentials are removed from its error',async()=>{
  const token='github_pat_test_value_only';
  const github=createGithubClient(token,async()=>Response.json({message:'Forbidden '+token},{status:403}));
  await assert.rejects(github('/repos/Sun-XT9527/personal-blog/actions/secrets/public-key','GET',undefined,'读取回调密钥加密配置'),error=>{
    assert.ok(error instanceof Error);
    assert.match(error.message,/读取回调密钥加密配置失败（GitHub 403）/);
    assert.ok(!error.message.includes(token));
    return true;
  });
});
