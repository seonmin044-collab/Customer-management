// =============================================
// 공급사 반품 관리 게시판 - Code.gs
// =============================================

var SPREADSHEET_ID = '1sRkie0TtcS82oxdAx-whJMd0n4SVglrc87-kMbHm2v0';

var SHEET_NAMES = {
  'sanon1p':   '상온 1P',
  'sanon3p':   '상온 3P',
  'naengjan':  '냉장',
  'naengdong': '냉동'
};

// ── 실제 시트 컬럼 구조 (0-based) ──
//
// 상온 1P:
//   0:게시글ID  1:위치  2:마스터코드  3:상품명  4:수량  5:PLT/박스  6:사진URL  7:댓글JSON
//
// 상온 3P:
//   0:게시글ID  1:위치  2:업체명  3:마스터코드  4:상품명  5:수량  6:PLT/박스  7:사진URL  8:댓글JSON
//
// 냉장 / 냉동:
//   0:게시글ID  1:마스터코드  2:상품명  3:수량  4:PLT/박스  5:사진URL  6:댓글JSON

var HEADERS_1P    = ['게시글ID','위치','마스터코드','상품명','수량','PLT/박스','사진URL','댓글JSON'];
var HEADERS_3P    = ['게시글ID','위치','업체명','마스터코드','상품명','수량','PLT/박스','사진URL','댓글JSON'];
var HEADERS_OTHER = ['게시글ID','마스터코드','상품명','수량','PLT/박스','사진URL','댓글JSON'];

// 반품 게시판용 상품 조회 시트
// 상온 1P / 냉장 / 냉동: A열(0)=마스터코드, I열(8)=상품명
var PRODUCT_SHEET_ID_DEFAULT  = '1PsbVMUNapdWqVWv89WykRTS1PtPtPmrwz_wzvW_nVII';
var PRODUCT_SHEET_GID_DEFAULT = '2112826214';

// 상온 3P: E열(4)=마스터코드, F열(5)=상품명, D열(3)=업체명
var PRODUCT_SHEET_ID_3P  = '1MWgLCTUNAzdkBAh_zdhkPMpWmhzr693nOjtiEU3Z7uk';
var PRODUCT_SHEET_GID_3P = '1321947436';

// 상품 정보 검색 시트 (사이드바 "상품 정보 검색" 메뉴)
// A열(0)=마스터코드, B열(1)=상품바코드, E열(4)=온도대, F열(5)=유형[1P/3P], I열(8)=상품명
var INFO_SHEET_ID  = '1PsbVMUNapdWqVWv89WykRTS1PtPtPmrwz_wzvW_nVII';
var INFO_SHEET_GID = '2112826214';

// 상품 정보 검색 3P 시트: A열(0)=바코드, D열(3)=업체명, E열(4)=마스터코드, F열(5)=상품명
var INFO_SHEET_ID_3P  = '1MWgLCTUNAzdkBAh_zdhkPMpWmhzr693nOjtiEU3Z7uk';
var INFO_SHEET_GID_3P = '1321947436';

function is1P(k){ return k === 'sanon1p'; }
function is3P(k){ return k === 'sanon3p'; }
function isSanon(k){ return k === 'sanon1p' || k === 'sanon3p'; }

// =============================================
// 웹 앱 진입점
// =============================================
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('공급사 반품 관리 게시판')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// =============================================
// 시트 유틸리티
// =============================================
function getSheet(sheetKey) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheetName = SHEET_NAMES[sheetKey];
  if (!sheetName) throw new Error('알 수 없는 카테고리: ' + sheetKey);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = is1P(sheetKey) ? HEADERS_1P : is3P(sheetKey) ? HEADERS_3P : HEADERS_OTHER;
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function generateId() {
  return 'ID_' + new Date().getTime() + '_' + Math.floor(Math.random() * 9000 + 1000);
}

function formatDate(val) {
  if (!val) return '';
  var d;
  if (val instanceof Date) { d = val; }
  else {
    var s = String(val);
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s;
    d = new Date(s);
  }
  if (isNaN(d.getTime())) return String(val);
  function pad(n){ return String(n).padStart(2,'0'); }
  return d.getFullYear()+'/'+pad(d.getMonth()+1)+'/'+pad(d.getDate());
}

function splitPhotos(raw) {
  return raw ? String(raw).split(',').map(function(s){return s.trim();}).filter(Boolean) : [];
}
function parseComments(raw) {
  var c=[]; try{ c=raw?JSON.parse(String(raw)):[];} catch(e){} return c;
}

// row → 객체
function rowToObj(row, sheetKey) {
  if (is1P(sheetKey)) {
    // 0:ID  1:위치  2:마스터코드  3:상품명  4:수량  5:PLT/박스  6:사진  7:댓글
    return { id:String(row[0]||''), location:String(row[1]||''), company:'',
             masterCode:String(row[2]||''), productName:String(row[3]||''),
             quantity:String(row[4]||''), pltBox:String(row[5]||''),
             photos:splitPhotos(row[6]), comments:parseComments(row[7]) };
  } else if (is3P(sheetKey)) {
    // 0:ID  1:위치  2:업체명  3:마스터코드  4:상품명  5:수량  6:PLT/박스  7:사진  8:댓글
    return { id:String(row[0]||''), location:String(row[1]||''), company:String(row[2]||''),
             masterCode:String(row[3]||''), productName:String(row[4]||''),
             quantity:String(row[5]||''), pltBox:String(row[6]||''),
             photos:splitPhotos(row[7]), comments:parseComments(row[8]) };
  } else {
    // 0:ID  1:마스터코드  2:상품명  3:수량  4:PLT/박스  5:사진  6:댓글
    return { id:String(row[0]||''), location:'', company:'',
             masterCode:String(row[1]||''), productName:String(row[2]||''),
             quantity:String(row[3]||''), pltBox:String(row[4]||''),
             photos:splitPhotos(row[5]), comments:parseComments(row[6]) };
  }
}

// =============================================
// 상품명 조회 (등록 폼용)
// =============================================
function lookupProduct(sheetKey, masterCode) {
  try {
    var code = String(masterCode).replace(/\s/g,'').toLowerCase();
    if (!code) return { found: false };
    // CacheService로 GAS 서버 사이드 캐시 (6분)
    var cache = CacheService.getScriptCache();
    var cKey = 'lp_'+sheetKey+'_'+code;
    var cached = cache.get(cKey);
    if (cached) return JSON.parse(cached);
    function findSheet(ssId, gid) {
      var ss = SpreadsheetApp.openById(ssId);
      var sheets = ss.getSheets();
      for (var k=0; k<sheets.length; k++) { if (String(sheets[k].getSheetId())===String(gid)) return sheets[k]; }
      return ss.getSheets()[0];
    }
    if (is3P(sheetKey)) {
      var s3=findSheet(PRODUCT_SHEET_ID_3P,PRODUCT_SHEET_GID_3P);
      var d3=s3.getDataRange().getValues();
      for (var i=1;i<d3.length;i++) {
        if (String(d3[i][4]||'').replace(/\s/g,'').toLowerCase()===code) {
          var r3={found:true,productName:String(d3[i][5]||''),company:String(d3[i][3]||'')};
          cache.put(cKey,JSON.stringify(r3),360);
          return r3;
        }
      }
    } else {
      var sd=findSheet(PRODUCT_SHEET_ID_DEFAULT,PRODUCT_SHEET_GID_DEFAULT);
      var dd=sd.getDataRange().getValues();
      for (var r=1;r<dd.length;r++) {
        if (String(dd[r][0]||'').replace(/\s/g,'').toLowerCase()===code) {
          var rd={found:true,productName:String(dd[r][8]||''),company:''};
          cache.put(cKey,JSON.stringify(rd),360);
          return rd;
        }
      }
    }
    return { found:false };
  } catch(e) { return { error:e.message }; }
}

// =============================================
// 상품 정보 검색 (사이드바 메뉴용)
// A(0)=마스터코드, B(1)=상품바코드, E(4)=온도대, F(5)=유형, I(8)=상품명
// =============================================
// searchProductInfo(query, tempFilter, typeFilter, fieldFilter)
// typeFilter : '1p'(default) | '3p'
// tempFilter : '' = 전체, '상온' | '냉장' | '냉동'
// fieldFilter: 'masterCode'(default) | 'barcode' | 'productName'
function searchProductInfo(query, tempFilter, typeFilter, fieldFilter) {
  try {
    var q     = String(query||'').replace(/\s/g,'').toLowerCase();
    var temp  = String(tempFilter||'').replace(/\s/g,'').toLowerCase();
    var type  = String(typeFilter||'1p').toLowerCase();
    var field = String(fieldFilter||'masterCode');
    var cKey  = 'si3_'+type+'_'+temp+'_'+field+'_'+q;
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cKey);
    if (cached) return JSON.parse(cached);

    var results = [];

    // 검색어 매칭 헬퍼 — field 기준으로만 검색
    function matches(mc, bc, pn) {
      if (!q) return true;
      if (field === 'barcode')      return bc.indexOf(q) !== -1;
      if (field === 'productName')  return pn.indexOf(q) !== -1;
      return mc.indexOf(q) !== -1;  // masterCode (default)
    }

    if (type === '3p') {
      // 3P 시트: A(0)=바코드, D(3)=업체명, E(4)=마스터코드, F(5)=상품명
      var ss3 = SpreadsheetApp.openById(INFO_SHEET_ID_3P);
      var sheets3 = ss3.getSheets();
      var sheet3 = null;
      for (var k=0; k<sheets3.length; k++) {
        if (String(sheets3[k].getSheetId())===INFO_SHEET_GID_3P) { sheet3=sheets3[k]; break; }
      }
      if (!sheet3) sheet3 = ss3.getSheets()[0];
      var data3 = sheet3.getDataRange().getValues();
      for (var i=1; i<data3.length; i++) {
        var row3        = data3[i];
        var barcode3    = String(row3[0]||'');
        var company3    = String(row3[3]||'');
        var masterCode3 = String(row3[4]||'');
        var productName3= String(row3[5]||'');
        if (!masterCode3 && !productName3) continue;
        if (!matches(
          masterCode3.replace(/\s/g,'').toLowerCase(),
          barcode3.replace(/\s/g,'').toLowerCase(),
          productName3.replace(/\s/g,'').toLowerCase()
        )) continue;
        results.push({ masterCode:masterCode3, barcode:barcode3, company:company3, temperature:'상온', type:'3P', productName:productName3 });
        if (results.length >= 100) break;
      }
    } else {
      // 1P 기본 시트: A(0)=마스터코드, B(1)=바코드, E(4)=온도대, F(5)=유형, I(8)=상품명
      var ss = SpreadsheetApp.openById(INFO_SHEET_ID);
      var sheets = ss.getSheets();
      var sheet = null;
      for (var j=0; j<sheets.length; j++) {
        if (String(sheets[j].getSheetId())===INFO_SHEET_GID) { sheet=sheets[j]; break; }
      }
      if (!sheet) sheet = ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();
      for (var r=1; r<data.length; r++) {
        var row         = data[r];
        var masterCode  = String(row[0]||'');
        var barcode     = String(row[1]||'');
        var temperature = String(row[4]||'');
        var rowType     = String(row[5]||'');
        var productName = String(row[8]||'');
        if (!masterCode && !productName) continue;
        // 온도 필터
        if (temp && temperature.replace(/\s/g,'').toLowerCase().indexOf(temp) === -1) continue;
        // 검색어 매칭 (field 기준)
        if (!matches(
          masterCode.replace(/\s/g,'').toLowerCase(),
          barcode.replace(/\s/g,'').toLowerCase(),
          productName.replace(/\s/g,'').toLowerCase()
        )) continue;
        results.push({ masterCode:masterCode, barcode:barcode, company:'', temperature:temperature, type:rowType, productName:productName });
        if (results.length >= 100) break;
      }
    }

    var sRes = { results: results };
    cache.put(cKey, JSON.stringify(sRes), 360);
    return sRes;
  } catch(e) { return { error: e.message }; }
}

// =============================================
// 게시글 목록 조회
// =============================================
function getPosts(sheetKey, page, searchQuery) {
  try {
    var sheet = getSheet(sheetKey);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { posts:[], total:0, page:page };
    var rows = [];
    for (var i=1; i<data.length; i++) { if (!data[i][0]) continue; rows.push(rowToObj(data[i],sheetKey)); }
    if (searchQuery && searchQuery.trim()) {
      var q = searchQuery.replace(/\s/g,'').toLowerCase();
      rows = rows.filter(function(r){
        return r.masterCode.replace(/\s/g,'').toLowerCase().indexOf(q)!==-1||
               r.company.replace(/\s/g,'').toLowerCase().indexOf(q)!==-1||
               r.productName.replace(/\s/g,'').toLowerCase().indexOf(q)!==-1||
               r.location.replace(/\s/g,'').toLowerCase().indexOf(q)!==-1;
      });
    }
    rows.sort(function(a,b){ return (b.id>a.id)?1:(b.id<a.id)?-1:0; });
    var pageSize=15, total=rows.length, pageNum=parseInt(page)||1, start=(pageNum-1)*pageSize;
    return { posts:rows.slice(start,start+pageSize), total:total, page:pageNum };
  } catch(e) { return { error:e.message }; }
}

// =============================================
// 게시글 단건 조회
// =============================================
function getPost(sheetKey, postId) {
  try {
    var sheet=getSheet(sheetKey), data=sheet.getDataRange().getValues();
    for (var i=1;i<data.length;i++) { if (String(data[i][0])===String(postId)) return rowToObj(data[i],sheetKey); }
    return { error:'게시글을 찾을 수 없습니다.' };
  } catch(e) { return { error:e.message }; }
}

// =============================================
// 게시글 등록
// =============================================
function createPost(sheetKey, postData) {
  try {
    var sheet=getSheet(sheetKey), newId=generateId();
    var photosStr=Array.isArray(postData.photos)&&postData.photos.length>0?postData.photos.join(','):'';
    var row;
    if (is1P(sheetKey)) {
      row=[newId, postData.location||'', postData.masterCode||'', postData.productName||'',
           postData.quantity||'', postData.pltBox||'', photosStr, '[]'];
    } else if (is3P(sheetKey)) {
      row=[newId, postData.location||'', postData.company||'', postData.masterCode||'',
           postData.productName||'', postData.quantity||'', postData.pltBox||'', photosStr, '[]'];
    } else {
      row=[newId, postData.masterCode||'', postData.productName||'',
           postData.quantity||'', postData.pltBox||'', photosStr, '[]'];
    }
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return { success:true, id:newId };
  } catch(e) { return { error:e.message }; }
}

// =============================================
// 게시글 수정
// =============================================
function updatePost(sheetKey, postId, postData) {
  try {
    var sheet=getSheet(sheetKey), data=sheet.getDataRange().getValues();
    var photosStr=Array.isArray(postData.photos)&&postData.photos.length>0?postData.photos.join(','):'';
    for (var i=1;i<data.length;i++) {
      if (String(data[i][0])!==String(postId)) continue;
      var rn=i+1;
      if (is1P(sheetKey)) {
        sheet.getRange(rn,2,1,6).setValues([[postData.location||'',postData.masterCode||'',postData.productName||'',postData.quantity||'',postData.pltBox||'',photosStr]]);
      } else if (is3P(sheetKey)) {
        sheet.getRange(rn,2,1,7).setValues([[postData.location||'',postData.company||'',postData.masterCode||'',postData.productName||'',postData.quantity||'',postData.pltBox||'',photosStr]]);
      } else {
        sheet.getRange(rn,2,1,5).setValues([[postData.masterCode||'',postData.productName||'',postData.quantity||'',postData.pltBox||'',photosStr]]);
      }
      SpreadsheetApp.flush();
      return { success:true };
    }
    return { error:'게시글을 찾을 수 없습니다.' };
  } catch(e) { return { error:e.message }; }
}

// =============================================
// 게시글 삭제
// =============================================
function deletePost(sheetKey, postId) {
  try {
    var sheet=getSheet(sheetKey), data=sheet.getDataRange().getValues();
    for (var i=1;i<data.length;i++) {
      if (String(data[i][0])===String(postId)) { sheet.deleteRow(i+1); SpreadsheetApp.flush(); return { success:true }; }
    }
    return { error:'게시글을 찾을 수 없습니다.' };
  } catch(e) { return { error:e.message }; }
}

// =============================================
// 댓글 추가
// =============================================
function addComment(sheetKey, postId, commentData) {
  try {
    var sheet=getSheet(sheetKey), data=sheet.getDataRange().getValues();
    var cmIdx = is1P(sheetKey)?7 : is3P(sheetKey)?8 : 6;
    for (var i=1;i<data.length;i++) {
      if (String(data[i][0])!==String(postId)) continue;
      var comments=[]; try{ comments=data[i][cmIdx]?JSON.parse(String(data[i][cmIdx])):[];} catch(e){}
      var nc={ cid:'C_'+new Date().getTime(), content:commentData.content||'', date:formatDate(new Date()) };
      comments.push(nc);
      sheet.getRange(i+1,cmIdx+1).setValue(JSON.stringify(comments));
      SpreadsheetApp.flush();
      return { success:true, comment:nc };
    }
    return { error:'게시글을 찾을 수 없습니다.' };
  } catch(e) { return { error:e.message }; }
}

// =============================================
// 댓글 수정
// =============================================
function updateComment(sheetKey, postId, cid, newContent) {
  try {
    var sheet=getSheet(sheetKey), data=sheet.getDataRange().getValues();
    var cmIdx = is1P(sheetKey)?7 : is3P(sheetKey)?8 : 6;
    for (var i=1;i<data.length;i++) {
      if (String(data[i][0])!==String(postId)) continue;
      var comments=[]; try{ comments=data[i][cmIdx]?JSON.parse(String(data[i][cmIdx])):[];} catch(e){}
      var found=false;
      for (var j=0;j<comments.length;j++) { if(comments[j].cid===cid){ comments[j].content=newContent||''; found=true; break; } }
      if (!found) return { error:'댓글을 찾을 수 없습니다.' };
      sheet.getRange(i+1,cmIdx+1).setValue(JSON.stringify(comments));
      SpreadsheetApp.flush();
      return { success:true };
    }
    return { error:'게시글을 찾을 수 없습니다.' };
  } catch(e) { return { error:e.message }; }
}

// =============================================
// 이미지 업로드
// =============================================
function uploadImage(base64Data, fileName, mimeType) {
  try {
    var decoded=Utilities.base64Decode(base64Data);
    var blob=Utilities.newBlob(decoded,mimeType,fileName);
    var folder=getOrCreateFolder('반품관리_이미지');
    var file=folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
    var fileId=file.getId();
    return { success:true, url:'https://drive.google.com/thumbnail?id='+fileId+'&sz=w1000', fileId:fileId };
  } catch(e) { return { error:e.message }; }
}

function getOrCreateFolder(folderName) {
  var folders=DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}