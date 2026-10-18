import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

export async function checkSessionProgress(page,base,output) {
 const saved=()=>page.waitForFunction(()=>document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
 const answer=async(id,value)=>{await page.locator(`#${id}`).fill(value);await page.locator('#lesson-submit').click();await saved();};
 const next=async()=>{await page.locator('#lesson-next').click();await saved();};
 await page.goto(base);await page.locator('#demo').click();await page.locator('#orientation').selectOption('landscape');await page.locator('#lesson-start').click();await saved();
 assert.equal(await page.locator('#print-output').inputValue(),'learner');assert.equal(await page.locator('#print-exercise').inputValue(),'heading');
 await answer('answer-heading','0');
 assert.ok(!(await page.locator('#lesson-status').textContent()).includes('angularErrorDeg'));
 await page.locator('#lesson-score-details summary').click();assert.match(await page.locator('#lesson-score-record').textContent(),/angularErrorDeg/);
 await next();await page.locator('#endpoint-reference').selectOption('A');await page.locator('#lesson-submit').click();await saved();await next();
 for(const edge of ['AB','BC']){await page.locator('#trace-edge').selectOption(edge);await page.locator('#trace-add').click();}
 await page.locator('#lesson-submit').click();await saved();await next();
 assert.equal(await page.locator('#print-exercise').inputValue(),'detour','printing follows the active task');
 assert.equal(await page.locator('#paper-map .closure-line').count(),2);
 assert.match(await page.locator('#print-selection-status').textContent(),/Learner worksheet.*2 pages.*follows current/);
 await page.locator('#print-exercise').selectOption('heading');assert.equal(await page.locator('#print-follow-current').isChecked(),false);
 assert.match(await page.locator('#print-selection-status').textContent(),/manual question/);
 await page.evaluate(()=>{window.print=()=>{window.testPrintedQuestion=document.querySelector('#print-exercise').value;};});
 await page.locator('#print-current').click();assert.equal(await page.evaluate(()=>window.testPrintedQuestion),'detour');
 assert.equal(await page.locator('#print-follow-current').isChecked(),true);assert.equal(await page.locator('#exercise-pages .sheet-answer').count(),0);
 await page.locator('#print-output').selectOption('instructor');await page.locator('#print-current').click();
 assert.match(await page.locator('#print-selection-status').textContent(),/Instructor guide/);assert.ok(await page.locator('#exercise-pages .sheet-answer').count()>0);
 assert.equal(await page.locator('#map .exercise-mark').filter({hasText:/^X$/}).count(),0,'print audience never changes practice annotations');
 await page.locator('#print-output').selectOption('learner');
 const pdfEvent=page.waitForEvent('download');await page.locator('#lesson-pdf').click();const pdf=await pdfEvent;
 assert.match(pdf.suggestedFilename(),/synthetic-square-r2-detour-learner-landscape\.pdf$/);await pdf.saveAs(new URL('current-question-detour.pdf',output).pathname);
 await page.locator('#lesson-end').click();await saved();
 assert.match(await page.locator('#lesson-progress').textContent(),/Ended early.*3\/4 answered.*3 correct/);
 assert.equal(await page.locator('#lesson-route').textContent(),'');assert.equal(await page.locator('#lesson-fields').isVisible(),false);
 assert.equal(await page.locator('#trace-start').inputValue(),'','independent review does not retain a stale task start');
 assert.equal(await page.locator('#print-current').isDisabled(),true);
 await page.locator('#practice-workspace').screenshot({path:new URL('session-ended-early.png',output).pathname});
 const event=page.waitForEvent('download');await page.locator('#lesson-export').click();const file=await event,old=JSON.parse(await readFile(await file.path()));
 assert.equal(old.backupVersion,1);assert.equal(old.sessions[0].status,'completed');assert.equal(old.attempts.length,3);
 await page.reload();await page.locator('#saved-session option').filter({hasText:/Ended.*3\/4 answered/}).waitFor({state:'attached'});
 const header=await page.locator('#saved-session option').filter({hasText:/Ended.*3\/4 answered/}).last().textContent();
 assert.match(header,/Synthetic streets and bridge crossing/);assert.ok(!/[a-f0-9]{8}-[a-f0-9]{4}-/.test(header));
 // Import the exact old v1 lifecycle/record shape: closed is not inferred as fully answered.
 await page.locator('#lesson-import').setInputFiles({name:'legacy-ended.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
 await page.waitForFunction(()=>document.getElementById('lesson-status').textContent.startsWith('Session restored'));
 assert.match(await page.locator('#lesson-progress').textContent(),/Ended early.*3\/4 answered/);
 // Pausing keeps the record resumable, discards a draft and supports keyboard focus.
 await page.locator('#lesson-start').click();await saved();await page.locator('#lesson-hint').click();await saved();await page.locator('#answer-heading').fill('75');
 await page.locator('#lesson-pause').focus();await page.keyboard.press('Enter');
 assert.match(await page.locator('#lesson-progress').textContent(),/^Paused.*0\/4/);
 assert.equal(await page.locator('#lesson-hints').isVisible(),false,'paused task hints are hidden');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'lesson-resume');
 await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'answer-heading');assert.equal(await page.locator('#answer-heading').inputValue(),'');assert.equal(await page.locator('#lesson-hints li').count(),1,'resume retains authored hints');
 await page.locator('#lesson-pause').click();
 const pausedEvent=page.waitForEvent('download');await page.locator('#lesson-export').click();const paused=JSON.parse(await readFile(await (await pausedEvent).path()));assert.equal(paused.sessions[0].status,'active');
 await page.reload();await page.locator('#lesson-import').setInputFiles({name:'paused-v1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(paused))});
 await page.waitForFunction(()=>document.getElementById('lesson-status').textContent.startsWith('Session restored'));await saved();assert.equal(await page.locator('#answer-heading').isEnabled(),true);
 // Four submitted answers can all be wrong without being reported as mastery.
 await answer('answer-heading','180');await next();await page.locator('#endpoint-reference').selectOption('C');await page.locator('#lesson-submit').click();await saved();await next();
 await page.locator('#trace-edge').selectOption('AB');await page.locator('#trace-add').click();await page.locator('#lesson-submit').click();await saved();await next();
 for(const edge of ['AB','BC']){await page.locator('#trace-edge').selectOption(edge);await page.locator('#trace-add').click();}
 await page.locator('#lesson-submit').click();await saved();await next();
 assert.match(await page.locator('#lesson-progress').textContent(),/All questions answered.*4\/4 answered.*0 correct/);
 assert.match(await page.locator('#lesson-progress').textContent(),/does not establish mastery/);
 await page.locator('#practice-workspace').screenshot({path:new URL('session-coverage-versus-accuracy.png',output).pathname});
 return {earlyEndCoverage:true,coverageNotAccuracy:true,pauseResume:true,legacyV1Import:true,humanSavedLabels:true,currentQuestionPrint:true,manualOverride:true,audienceIsolation:true,questionFilename:true};
}
