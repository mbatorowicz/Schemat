import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mainPath = path.join(__dirname, "../src/main.js");
let s = fs.readFileSync(mainPath, "utf8");

// Remove old migrateConnModel
s = s.replace(/function migrateConnModel\(\)\{[\s\S]*?return changed;\n\}/, "");

// Replace conn function block with wireConnModel + UI helpers
const connBlockStart = "function isConnGroup(el){ return !!el&&el.tagName";
const connBlockEnd = "function finishConnDraw(drawKind,pts,node){";
const startIdx = s.indexOf(connBlockStart);
const endIdx = s.indexOf(connBlockEnd);
if (startIdx < 0 || endIdx < 0) throw new Error("conn block markers not found");

const replacement = `// ---- model złączy (SSOT: conn-theme.js + conn-model.js) ----
let isConnGroup,isConnPoint,isConnLead,connParts,connKind,connJointR,connStrokeTargets,connFillTarget,connStyleSampleEl;
let applyConnStyle,updateConnContacts,updateConnGeometry,updateConnLabel,syncConnJointAnchor;
let setConnOuter,setConnOuterFree,setConnPointCenter,moveConn,pushConnContactCandidates;
let promptConnMeta,mkConn,finishConnDraw,migrateConnModelImpl,dirFromDelta,connDirVector;

function isSchematicSheet(node){ return !!(node&&/^sch-/.test(node.id||"")); }

function wireConnModel(){
  const m=createConnModel({state,num,fmt,mkEl,setPositionedElement,styleText,isSchematicSheet});
  ({
    isConnGroup,isConnPoint,isConnLead,connParts,connKind,connJointR,connStrokeTargets,connFillTarget,connStyleSampleEl,
    applyConnStyle,updateConnContacts,updateConnGeometry,updateConnLabel,syncConnJointAnchor,
    setConnOuter,setConnOuterFree,setConnPointCenter,moveConn,pushConnContactCandidates,
    promptConnMeta,mkConn,finishConnDraw,
    migrateConnModel:migrateConnModelImpl,dirFromDelta,connDirVector
  }=m);
}

function migrateConnModel(){
  return migrateConnModelImpl(state.lib,state.sheets,SVGNS);
}

function moveConnLabel(conn,dx,dy){
  const label=connParts(conn).label;
  setConnLabelManual(conn);
  setPositionedElement(label,num(label,"x")+dx,num(label,"y")+dy);
}
function clearConnLabelSel(){ state.connLabelSel=null; }
function selectConnLabel(conn){ state.connLabelSel=conn; state.selection=[conn]; state.activeEl=conn; state.selHandle=null; }
function connLabelEl(){ return state.connLabelSel?connParts(state.connLabelSel).label:null; }
function isConnLabelMode(){ return !!state.connLabelSel; }
function isConnLabelManual(g){ return g&&g.getAttribute("data-label-manual")==="1"; }
function setConnLabelManual(g){ if(g) g.setAttribute("data-label-manual","1"); }

function buildConnHandles(el){
  const p=connParts(el), kind=connKind(el), jr=connJointR(el);
  if(kind==="point"){
    state.handles.push(mkHandle(()=>[num(p.joint,"cx"),num(p.joint,"cy")],(x,y)=>{clearConnLabelSel();setConnPointCenter(el,x,y);},"pt",el));
    state.handles.push(mkHandle(()=>[num(p.joint,"cx")+jr,num(p.joint,"cy")],(x,y)=>{const cx=num(p.joint,"cx"),cy=num(p.joint,"cy"),r=Math.max(1,Math.hypot(x-cx,y-cy));p.joint.setAttribute("r",fmt(r));el.setAttribute("data-joint-r",fmt(r));updateConnContacts(el);},"pt",el));
  } else {
    state.handles.push(mkHandle(()=>[num(p.stub,"x1"),num(p.stub,"y1")],(x,y)=>{clearConnLabelSel();p.stub.setAttribute("x1",fmt(x));p.stub.setAttribute("y1",fmt(y));updateConnGeometry(el);},"pt",el));
    state.handles.push(mkHandle(()=>[num(p.stub,"x2"),num(p.stub,"y2")],(x,y)=>{clearConnLabelSel();setConnOuterFree(el,x,y);},"pt",el));
  }
  state.handles.push(mkHandle(()=>[num(p.label,"x"),num(p.label,"y")],(x,y)=>{selectConnLabel(el);setConnLabelManual(el);setPositionedElement(p.label,x,y);},"lbl",el));
}

`;

// Find end of finishConnDraw function
const finishStart = s.indexOf(connBlockEnd, endIdx);
let brace = 0,
  i = finishStart,
  finishEnd = -1;
for (; i < s.length; i++) {
  if (s[i] === "{") brace++;
  if (s[i] === "}") {
    brace--;
    if (brace === 0) {
      finishEnd = i + 1;
      break;
    }
  }
}
if (finishEnd < 0) throw new Error("finishConnDraw end not found");

s = s.slice(0, startIdx) + replacement + s.slice(finishEnd);

// DEFAULT_STYLE: use connAllCss()
s = s.replace(
  /  "\.symt\{fill:none;stroke:#0f172a;stroke-width:1\.5;stroke-linecap:round;stroke-linejoin:round;\}\\n"\+[\s\S]*?  "\.conn-contact\{fill:#dc2626;stroke:none;pointer-events:none;\}\\n"\+/,
  '  ".symt{fill:none;stroke:#0f172a;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}\\n"+\n  connAllCss()+'
);

// strokeW handler
s = s.replace(
  /if\(targets\.length\)\{ pushUndo\(\); targets\.forEach\(r=>connStrokeTargets\(r\)\.forEach\(n=>n\.style\.strokeWidth=fmt\(v\)\)\);/,
  "if(targets.length){ pushUndo(); targets.forEach(r=>{ if(isConnGroup(r.el)){ connStrokeTargets(r).forEach(n=>n.style.strokeWidth=fmt(v)); applyConnStyle(r.el); } else connStrokeTargets(r).forEach(n=>n.style.strokeWidth=fmt(v)); });"
);

// adoptLibraryFromParsed
s = s.replace(
  /state\.lib=\{handle:handle\|\|null,name:name\|\|"E-00_symbole\.svg",svg:parsed\.svg,doc:parsed\.doc\};\n  return true;/,
  `state.lib={handle:handle||null,name:name||"E-00_symbole.svg",svg:parsed.svg,doc:parsed.doc};
  syncConnStylesInLib(state.lib.svg,SVGNS);
  return true;`
);

// flushLibrary sync
s = s.replace(
  /function flushLibrary\(\)\{ const s=libSnapshot\(\);/,
  "function flushLibrary(){ if(state.lib&&state.lib.svg) syncConnStylesInLib(state.lib.svg,SVGNS); const s=libSnapshot();"
);

// wireConnModel at boot
if (!s.includes("wireConnModel();")) {
  s = s.replace(
    /\(async function boot\(\)\{\n  const prefs = await loadPrefs\(\);/,
    "(async function boot(){\n  wireConnModel();\n  const prefs = await loadPrefs();"
  );
}

// finishConnDraw status messages - conn model returns null without setStatus for short lead
// keep finishShape handling

fs.writeFileSync(mainPath, s);
console.log("patched main.js");
