import test from 'node:test';
import assert from 'node:assert/strict';
import {selectPublication} from '../scripts/pick-release.mjs';
const id='00000000-0000-4000-8000-000000000001';
test('scheduled publishing skips an empty queue and takes the newest submitted snapshot',async()=>{
  assert.deepEqual(await selectPublication({event:'schedule',fetchPending:async()=>null}),{releaseId:'',shouldBuild:false});
  assert.deepEqual(await selectPublication({event:'schedule',fetchPending:async()=>({id})}),{releaseId:id,shouldBuild:true});
});
test('manual publishing takes queued content and a code push builds the current live snapshot',async()=>{
  assert.deepEqual(await selectPublication({event:'workflow_dispatch',fetchPending:async()=>({id})}),{releaseId:id,shouldBuild:true});
  assert.deepEqual(await selectPublication({event:'push',fetchPending:async()=>{throw new Error('unused')}}),{releaseId:'',shouldBuild:true});
});
test('publication identifiers cannot inject workflow output or environment values',async()=>{
  await assert.rejects(selectPublication({event:'schedule',fetchPending:async()=>({id:'bad\nshould_build=true'})}),/无效编号/);
  await assert.rejects(selectPublication({event:'workflow_dispatch',requested:'bad\nkey=value',fetchPending:async()=>null}),/编号不正确/);
});
