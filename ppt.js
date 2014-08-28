/* ppt.js (C) 2014 SheetJS -- http://sheetjs.com */
/* vim: set ts=2: */
var CFB = require('cfb');
var cptable = require('codepage');

var parsenoop = function(blob, length) { throw new Error("n"); blob.l += length; }

/* CString (UTF-16LE unicode string) */
function parse_CString(blob, length, opts) {
	var o = cptable.utils.decode(1200, blob.slice(blob.l, blob.l+length));
	blob.l += length;
	return o;
}

/* helper to read arrays of records */
function recordhopper(blob, cb, end, opts) {
	var filter = !!opts.records;
	//console.log("start hopper");
	while(blob.l < end) {
		var rh = parse_RecordHeader(blob);
		var R = RecordEnum[rh.Type];
		//console.error(rh.Type.toString(16), R, blob.l - 8, rh.Length, blob.length);
		if(!R) R = RecordEnum[0x6969];
		//console.log(R);
		if(filter && opts.records.indexOf(R.n) === -1 && opts.records.indexOf(rh.Type) === -1) { blob.l += rh.Length; continue; }
		var val = R.f(blob, rh.Length, opts);
		cb(R, val, rh.Length);
	}
	//console.log("end hopper");
}



/* [MS-PPT] 2.3.1 RecordHeader */
function parse_RecordHeader(blob) {
	var recverinst = blob.read_shift(2);
	var RecordType = blob.read_shift(2);
	var length = blob.read_shift(4);
	return { Type: RecordType, Length: length, Metadata: recverinst };
}

/* [MS-PPT] 2.3.2 CurrentUserAtom */
function parse_CurrentUserAtom(blob, length, opts) {
	blob.l += 16;
	var offset = blob.read_shift(4);
	blob.l += length - 20;
	return { offset: offset };
}

/* [MS-PPT] 2.3.3 UserEditAtom */
function parse_UserEditAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.3.4 PersistDirectoryAtom */
function parse_PersistDirectoryAtom(blob, length, opts) {
	var end = blob.l + length;
	var idcnt, pId, cPersist, cnt, i;
	var dir = [], dirobj, offsets;

	/* 2.3.5 PersistDirectoryEntry[] */
	while(blob.l < end) {
		idcnt = blob.read_shift(4);
		pId = idcnt & 0xFFFFF;
		cPersist = idcnt >>> 20;
		offsets = [];
		
		/* 2.3.6 PersistOffsetEntry[] */
		cnt = pId;
		for(var i = 0; i < cPersist; ++i) dir[pId + i] = blob.read_shift(4);
	}
	return dir;
}

/* [MS-PPT] 2.4.1 DocumentContainer */
function parse_DocumentContainer(blob, length, opts) {
	recordhopper(blob, function doc(R, val, len) {
		switch(R.n) {
			case 'RT_DocumentAtom': break;
			case 'RT_Environment': break;
			case 'RT_DrawingGroup': break;
			case 'RT_SlideListWithText': break;
			case 'RT_List': break
			case 'RT_HeadersFooters': blob.l -= len; break;
			case 'RT_HeadersFootersAtom': break;
			case 'RT_RoundTripCustomTableStyles12Atom': break;
			case 'RT_EndDocumentAtom': break;
			default: throw R.n; break;
		}
	}, blob.l + length, opts);
}

/* [MS-PPT] 2.4.2 DocumentAtom */
function parse_DocumentAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.4.3 DrawingGroupContainer */
function parse_DrawingGroupContainer(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.4.4 DocInfoListContainer */
function parse_DocInfoListContainer(blob, length, opts) {
	recordhopper(blob, function dilist(R, val) {
		switch(R.n) {
			case 'RT_NotesTextViewInfo9': break;
			case 'RT_SlideViewInfo': break;
			case 'RT_ProgTags': break;
			default: throw R.n; break;
		}
	}, blob.l + length, opts);
}

/* [MS-PPT] 2.4.13 EndDocumentAtom */
function parse_EndDocumentAtom(blob, length) { if(length !== 0) throw "EndDocumentAtom length != 0"; }

/* [MS-PPT] 2.4.14.3 SlideListWithTextContainer */
function parse_SlideListWithTextContainer(blob, length, opts) {
	recordhopper(blob, function slwt(R, val) {
		switch(R.n) {
			case 'RT_SlidePersistAtom': break;
			default: throw R.n; break;
		}
	}, blob.l + length, opts);
}

/* [MS-PPT] 2.4.14.5 SlidePersistAtom */
function parse_SlidePersistAtom(blob, length, opts) {
	var end = blob.l + length;
	var pId = blob.read_shift(4);
	blob.l += 4;
	var cTexts = blob.read_shift(4);
	var slideId = blob.read_shift(4);
	blob.l += 4;
	return { persistIdRef: pId, cTexts: cTexts, slideId: slideId };
}

/* [MS-PPT] 2.4.15.2 HeadersFootersAtom */
function parse_HeadersFootersAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.4.21.4 NotesTextViewInfoContainer */
function parse_NotesTextViewInfoContainer(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.5.1 SlideContainer */
function parse_SlideContainer(blob, length, opts) {
	recordhopper(blob, function rtslide(R, val) {
		switch(R.n) {
			case 'RT_SlideAtom': break;
			case 'RT_Drawing': break;
			case 'RT_ColorSchemeAtom': break;
			case 'RT_RoundTripContentMasterId12Atom': break;
			default: throw R.n; break;
		}
	}, blob.l + length, opts);
}

/* [MS-PPT] 2.5.3 MainMasterContainer */
function parse_MainMasterContainer(blob, length, opts) {
	recordhopper(blob, function mmaster(R, val) {
		switch(R.n) {
			case 'RT_SlideAtom': break;
			case 'RT_ColorSchemeAtom': break;
			case 'RT_TextMasterStyleAtom': break;
			case 'RT_RoundTripOArtTextStyles12Atom': break;
			case 'RT_RoundTripTheme12Atom': break;
			case 'RT_RoundTripColorMapping12Atom': break;
			case 'RT_RoundTripContentMasterInfo12Atom': break;
			case 'RT_RoundTripOriginalMainMasterId12Atom': break;
			case 'RT_Drawing': break;
			case 'RT_CString': break;
			default: throw R.n; break;
		}
	}, blob.l + length, opts);
}

/* [MS-PPT] 2.5.6 NotesContainer */
function parse_NotesContainer(blob, length, opts) {
	recordhopper(blob, function notes(R, val) {
		switch(R.n) {
			default: throw R.n; break;
		}
	}, blob.l + length, opts);
}

/* [MS-PPT] 2.5.10 SlideAtom */
function parse_SlideAtom(blob, length, opts) {
	var geom = blob.read_shift(4);
	var pt = [];
	for(var i = 0; i < 8; ++i) pt[i] = blob.read_shift(1);
	var masterIdRef = blob.read_shift(4);
	var notesIdRef = blob.read_shift(4);
	var slideFlags = blob.read_shift(2);
	blob.l += 2;
}

/* [MS-ODRAW] 2.2.9 OfficeArtFOPT */
function parse_OfficeArtFOPT(blob, length, opts) {
	blob.l += length;
}

/* [MS-ODRAW] 2.2.11 OfficeArtTertiaryFOPT */
function parse_OfficeArtTertiaryFOPT(blob, length, opts) {
	blob.l += length;
}

/* [MS-ODRAW] 2.2.13 OfficeArtDgContainer */
function parse_OfficeArtDgContainer(blob, length, opts) {
	recordhopper(blob, function oadc(R, val) {
	}, blob.l + length, opts);
}

/* [MS-ODRAW] 2.2.14 OfficeArtSpContainer */
function parse_OfficeArtSpContainer(blob, length, opts) {
	recordhopper(blob, function oasc(R, val) {
	}, blob.l + length, opts);
}

/* [MS-ODRAW] 2.2.16 OfficeArtSpgrContainer */
function parse_OfficeArtSpgrContainer(blob, length, opts) {
	recordhopper(blob, function oasgc(R, val) {
	}, blob.l + length, opts);
}

/* [MS-ODRAW] 2.2.38 OfficeArtFSPGR */
function parse_OfficeArtFSPGR(blob, length, opts) {
	blob.l += length;
}

/* [MS-ODRAW] 2.2.40 OfficeArtFSP */
function parse_OfficeArtFSP(blob, length, opts) {
	blob.l += length;
}

/* [MS-ODRAW] 2.2.49 OfficeArtFDG */
function parse_OfficeArtFDG(blob, length, opts) {
	return { csp: blob.read_shift(4), spidCur: blob.read_shift(4) };
}

/* [MS-PPT] 2.5.13 DrawingContainer */
function parse_DrawingContainer(blob, length, opts) {
	recordhopper(blob, function dc(R, val) {
	}, blob.l + length, opts);
}

/* [MS-PPT] 2.9.1 DocumentTextInfoContainer */
function parse_DocumentTextInfoContainer(blob, length, opts) {
	recordhopper(blob, function env(R, val) {
		switch(R.n) {
			case 'RT_Kinsoku': break;
			case 'RT_FontCollection': break;
			case 'RT_TextCharFormatExceptionAtom': break;
			case 'RT_TextParagraphFormatExceptionAtom': break;
			case 'RT_TextSpecialInfoDefaultAtom': break;
			case 'RT_TextMasterStyleAtom': break;
			default: throw R.n; break;
		}
	}, blob.l + length, opts);
}

/* [MS-PPT] 2.9.2 KinsokuContainer */
function parse_KinsokuContainer(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.2 FontCollectionContainer */
function parse_FontCollectionContainer(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.13 TextCFExceptionAtom */
function parse_TextCFExceptionAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.19 TextPFExceptionAtom */
function parse_TextPFExceptionAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.28 DefaultRulerAtom */
function parse_DefaultRulerAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.29 TextRulerAtom */
function parse_TextRulerAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.31 TextSIExceptionAtom */
function parse_TextSIExceptionAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.35 TextMasterStyleAtom */
function parse_TextMasterStyleAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.41 TextHeaderAtom */
function parse_TextHeaderAtom(blob, length, opts) { return blob.read_shift(4); }

/* [MS-PPT] 2.9.42 TextCharsAtom */
var parse_TextCharsAtom = parse_CString;

/* [MS-PPT] 2.9.43 TextBytesAtom */
function parse_TextBytesAtom(blob, length, opts) {
	var o = [];
	for(var i=0; i!=length; ++i) o.push(String.fromCharCode(blob.read_shift(1)));
	return o.join("");
}

/* [MS-PPT] 2.9.47 SlideNumberMCAtom */
function parse_SlideNumberMCAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.44 StyleTextPropAtom */
function parse_StyleTextPropAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.50 DateTimeMCAtom */
function parse_DateTimeMCAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.51 GenericDateMCAtom */
function parse_GenericDateMCAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.54 TextSpecialInfoAtom */
function parse_TextSpecialInfoAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.9.76 OfficeArtClientTextbox */
function parse_OfficeArtClientTextbox(blob, length, opts) {
	recordhopper(blob, function oact(R, val) {
		switch(R.n) {
			case 'RT_TextHeaderAtom': break;
			case 'RT_TextBytesAtom':
			case 'RT_TextCharsAtom':
				if(blob.l < opts.persist[3]) break;
				console.log(val.replace(/\r/g,"\n"));
				break;
			case 'RT_StyleTextPropAtom':
			case 'RT_GenericDateMetaCharAtom':
			case 'RT_TextRulerAtom':
			case 'RT_MasterTextPropAtom':
			case 'RT_TextSpecialInfoAtom':
			case 'RT_SlideNumberMetaCharAtom':
				break;
			default: throw R.n; break;
		}
	}, blob.l + length, opts);
}

/* [MS-PPT] 2.9.79 MasterTextPropAtom */
function parse_MasterTextPropAtom(blob, length, opts) { blob.l += length; }


/* [MS-PPT] 2.11.9 RoundTripColorMappingAtom */
function parse_RoundTripColorMappingAtom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.11.11 RoundTripContentMasterId12Atom */
function parse_RoundTripContentMasterId12Atom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.11.12 RoundTripContentMasterInfo12Atom */
function parse_RoundTripContentMasterInfo12Atom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.11.13 RoundTripCustomTableStyles12Atom */
function parse_RoundTripCustomTableStyles12Atom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.11.19 RoundTripOArtTextStyles12Atom */
function parse_RoundTripOArtTextStyles12Atom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.11.20 RoundTripOriginalMainMasterId12Atom */
function parse_RoundTripOriginalMainMasterId12Atom(blob, length, opts) { blob.l += length; }

/* [MS-PPT] 2.11.27 RoundTripThemeAtom */
function parse_RoundTripThemeAtom(blob, length, opts) { blob.l += length; }

function parse_SlideViewInfo$(blob, length, opts) { blob.l += length; }
function parse_ProgTags$(blob, length, opts) { blob.l += length; }
function parse_HeadersFooters$(blob, length, opts) { blob.l += length; }
function parse_ColorSchemeAtom$(blob, length, opts) { blob.l += length; }
 
/* [MS-PPT] 2.13.24 RecordType (other records are noted below) */
var RecordEnum = {
	0x03E8: { n:"RT_Document", f:parse_DocumentContainer },
	0x03E9: { n:"RT_DocumentAtom", f:parse_DocumentAtom },
	0x03EA: { n:"RT_EndDocumentAtom", f:parse_EndDocumentAtom },
	0x03EE: { n:"RT_Slide", f:parse_SlideContainer },
	0x03EF: { n:"RT_SlideAtom", f:parse_SlideAtom },
	0x03F0: { n:"RT_Notes", f:parse_NotesContainer },
	0x03F1: { n:"RT_NotesAtom", f:parsenoop },
	0x03F2: { n:"RT_Environment", f:parse_DocumentTextInfoContainer },
	0x03F3: { n:"RT_SlidePersistAtom", f:parse_SlidePersistAtom },
	0x03F8: { n:"RT_MainMaster", f:parse_MainMasterContainer },
	0x03F9: { n:"RT_SlideShowSlideInfoAtom", f:parsenoop },
	0x03FA: { n:"RT_SlideViewInfo", f:parse_SlideViewInfo$ },
	0x03FB: { n:"RT_GuideAtom", f:parsenoop },
	0x03FD: { n:"RT_ViewInfoAtom", f:parsenoop },
	0x03FE: { n:"RT_SlideViewInfoAtom", f:parsenoop },
	0x03FF: { n:"RT_VbaInfo", f:parsenoop },
	0x0400: { n:"RT_VbaInfoAtom", f:parsenoop },
	0x0401: { n:"RT_SlideShowDocInfoAtom", f:parsenoop },
	0x0402: { n:"RT_Summary", f:parsenoop },
	0x0406: { n:"RT_DocRoutingSlipAtom", f:parsenoop },
	0x0407: { n:"RT_OutlineViewInfo", f:parsenoop },
	0x0408: { n:"RT_SorterViewInfo", f:parsenoop },
	0x0409: { n:"RT_ExternalObjectList", f:parsenoop },
	0x040A: { n:"RT_ExternalObjectListAtom", f:parsenoop },
	0x040B: { n:"RT_DrawingGroup", f:parse_DrawingGroupContainer },
	0x040C: { n:"RT_Drawing", f:parse_DrawingContainer },
	0x040D: { n:"RT_GridSpacing10Atom", f:parsenoop },
	0x040E: { n:"RT_RoundTripTheme12Atom", f:parse_RoundTripThemeAtom },
	0x040F: { n:"RT_RoundTripColorMapping12Atom", f:parse_RoundTripColorMappingAtom },
	0x0410: { n:"RT_NamedShows", f:parsenoop },
	0x0411: { n:"RT_NamedShow", f:parsenoop },
	0x0412: { n:"RT_NamedShowSlidesAtom", f:parsenoop },
	0x0413: { n:"RT_NotesTextViewInfo9", f:parse_NotesTextViewInfoContainer },
	0x0414: { n:"RT_NormalViewSetInfo9", f:parsenoop },
	0x0415: { n:"RT_NormalViewSetInfo9Atom", f:parsenoop },
	0x041C: { n:"RT_RoundTripOriginalMainMasterId12Atom", f:parse_RoundTripOriginalMainMasterId12Atom },
	0x041D: { n:"RT_RoundTripCompositeMasterId12Atom", f:parsenoop },
	0x041E: { n:"RT_RoundTripContentMasterInfo12Atom", f:parse_RoundTripContentMasterInfo12Atom},
	0x041F: { n:"RT_RoundTripShapeId12Atom", f:parsenoop },
	0x0420: { n:"RT_RoundTripHFPlaceholder12Atom", f:parsenoop },
	0x0422: { n:"RT_RoundTripContentMasterId12Atom", f:parse_RoundTripContentMasterId12Atom},
	0x0423: { n:"RT_RoundTripOArtTextStyles12Atom", f:parse_RoundTripOArtTextStyles12Atom},
	0x0424: { n:"RT_RoundTripHeaderFooterDefaults12Atom", f:parsenoop },
	0x0425: { n:"RT_RoundTripDocFlags12Atom", f:parsenoop },
	0x0426: { n:"RT_RoundTripShapeCheckSumForCL12Atom", f:parsenoop },
	0x0427: { n:"RT_RoundTripNotesMasterTextStyles12Atom", f:parsenoop },
	0x0428: { n:"RT_RoundTripCustomTableStyles12Atom", f:parse_RoundTripCustomTableStyles12Atom },
	0x07D0: { n:"RT_List", f:parse_DocInfoListContainer },
	0x07D5: { n:"RT_FontCollection", f:parse_FontCollectionContainer },
	0x07D6: { n:"RT_FontCollection10", f:parsenoop },
	0x07E3: { n:"RT_BookmarkCollection", f:parsenoop },
	0x07E4: { n:"RT_SoundCollection", f:parsenoop },
	0x07E5: { n:"RT_SoundCollectionAtom", f:parsenoop },
	0x07E6: { n:"RT_Sound", f:parsenoop },
	0x07E7: { n:"RT_SoundDataBlob", f:parsenoop },
	0x07E9: { n:"RT_BookmarkSeedAtom", f:parsenoop },
	0x07F0: { n:"RT_ColorSchemeAtom", f:parse_ColorSchemeAtom$ },
	0x07F8: { n:"RT_BlipCollection9", f:parsenoop },
	0x07F9: { n:"RT_BlipEntity9Atom", f:parsenoop },
	0x0BC1: { n:"RT_ExternalObjectRefAtom", f:parsenoop },
	0x0BC3: { n:"RT_PlaceholderAtom", f:parsenoop },
	0x0BDB: { n:"RT_ShapeAtom", f:parsenoop },
	0x0BDC: { n:"RT_ShapeFlags10Atom", f:parsenoop },
	0x0BDD: { n:"RT_RoundTripNewPlaceholderId12Atom", f:parsenoop },
	0x0F9E: { n:"RT_OutlineTextRefAtom", f:parsenoop },
	0x0F9F: { n:"RT_TextHeaderAtom", f:parse_TextHeaderAtom },
	0x0FA0: { n:"RT_TextCharsAtom", f:parse_TextCharsAtom },
	0x0FA1: { n:"RT_StyleTextPropAtom", f:parse_StyleTextPropAtom },
	0x0FA2: { n:"RT_MasterTextPropAtom", f:parse_MasterTextPropAtom },
	0x0FA3: { n:"RT_TextMasterStyleAtom", f:parse_TextMasterStyleAtom },
	0x0FA4: { n:"RT_TextCharFormatExceptionAtom", f:parse_TextCFExceptionAtom },
	0x0FA5: { n:"RT_TextParagraphFormatExceptionAtom", f:parse_TextPFExceptionAtom },
	0x0FA6: { n:"RT_TextRulerAtom", f:parse_TextRulerAtom },
	0x0FA7: { n:"RT_TextBookmarkAtom", f:parsenoop },
	0x0FA8: { n:"RT_TextBytesAtom", f:parse_TextBytesAtom },
	0x0FA9: { n:"RT_TextSpecialInfoDefaultAtom", f:parse_TextSIExceptionAtom },
	0x0FAA: { n:"RT_TextSpecialInfoAtom", f:parse_TextSpecialInfoAtom },
	0x0FAB: { n:"RT_DefaultRulerAtom", f:parsenoop },
	0x0FAC: { n:"RT_StyleTextProp9Atom", f:parsenoop },
	0x0FAD: { n:"RT_TextMasterStyle9Atom", f:parsenoop },
	0x0FAE: { n:"RT_OutlineTextProps9", f:parsenoop },
	0x0FAF: { n:"RT_OutlineTextPropsHeader9Atom", f:parsenoop },
	0x0FB0: { n:"RT_TextDefaults9Atom", f:parsenoop },
	0x0FB1: { n:"RT_StyleTextProp10Atom", f:parsenoop },
	0x0FB2: { n:"RT_TextMasterStyle10Atom", f:parsenoop },
	0x0FB3: { n:"RT_OutlineTextProps10", f:parsenoop },
	0x0FB4: { n:"RT_TextDefaults10Atom", f:parsenoop },
	0x0FB5: { n:"RT_OutlineTextProps11", f:parsenoop },
	0x0FB6: { n:"RT_StyleTextProp11Atom", f:parsenoop },
	0x0FB7: { n:"RT_FontEntityAtom", f:parsenoop },
	0x0FB8: { n:"RT_FontEmbedDataBlob", f:parsenoop },
	0x0FBA: { n:"RT_CString", f:parse_CString },
	0x0FC1: { n:"RT_MetaFile", f:parsenoop },
	0x0FC3: { n:"RT_ExternalOleObjectAtom", f:parsenoop },
	0x0FC8: { n:"RT_Kinsoku", f:parse_KinsokuContainer },
	0x0FC9: { n:"RT_Handout", f:parsenoop },
	0x0FCC: { n:"RT_ExternalOleEmbed", f:parsenoop },
	0x0FCD: { n:"RT_ExternalOleEmbedAtom", f:parsenoop },
	0x0FCE: { n:"RT_ExternalOleLink", f:parsenoop },
	0x0FD0: { n:"RT_BookmarkEntityAtom", f:parsenoop },
	0x0FD1: { n:"RT_ExternalOleLinkAtom", f:parsenoop },
	0x0FD2: { n:"RT_KinsokuAtom", f:parsenoop },
	0x0FD3: { n:"RT_ExternalHyperlinkAtom", f:parsenoop },
	0x0FD7: { n:"RT_ExternalHyperlink", f:parsenoop },
	0x0FD8: { n:"RT_SlideNumberMetaCharAtom", f:parse_SlideNumberMCAtom },
	0x0FD9: { n:"RT_HeadersFooters", f:parse_HeadersFooters$ },
	0x0FDA: { n:"RT_HeadersFootersAtom", f:parse_HeadersFootersAtom },
	0x0FDF: { n:"RT_TextInteractiveInfoAtom", f:parsenoop },
	0x0FE4: { n:"RT_ExternalHyperlink9", f:parsenoop },
	0x0FE7: { n:"RT_RecolorInfoAtom", f:parsenoop },
	0x0FEE: { n:"RT_ExternalOleControl", f:parsenoop },
	0x0FF0: { n:"RT_SlideListWithText", f:parse_SlideListWithTextContainer },
	0x0FF1: { n:"RT_AnimationInfoAtom", f:parsenoop },
	0x0FF2: { n:"RT_InteractiveInfo", f:parsenoop },
	0x0FF3: { n:"RT_InteractiveInfoAtom", f:parsenoop },
	0x0FF5: { n:"RT_UserEditAtom", f:parse_UserEditAtom },
	0x0FF6: { n:"RT_CurrentUserAtom", f:parse_CurrentUserAtom },
	0x0FF7: { n:"RT_DateTimeMetaCharAtom", f:parse_DateTimeMCAtom },
	0x0FF8: { n:"RT_GenericDateMetaCharAtom", f:parse_GenericDateMCAtom },
	0x0FF9: { n:"RT_HeaderMetaCharAtom", f:parsenoop },
	0x0FFA: { n:"RT_FooterMetaCharAtom", f:parsenoop },
	0x0FFB: { n:"RT_ExternalOleControlAtom", f:parsenoop },
	0x1004: { n:"RT_ExternalMediaAtom", f:parsenoop },
	0x1005: { n:"RT_ExternalVideo", f:parsenoop },
	0x1006: { n:"RT_ExternalAviMovie", f:parsenoop },
	0x1007: { n:"RT_ExternalMciMovie", f:parsenoop },
	0x100D: { n:"RT_ExternalMidiAudio", f:parsenoop },
	0x100E: { n:"RT_ExternalCdAudio", f:parsenoop },
	0x100F: { n:"RT_ExternalWavAudioEmbedded", f:parsenoop },
	0x1010: { n:"RT_ExternalWavAudioLink", f:parsenoop },
	0x1011: { n:"RT_ExternalOleObjectStg", f:parsenoop },
	0x1012: { n:"RT_ExternalCdAudioAtom", f:parsenoop },
	0x1013: { n:"RT_ExternalWavAudioEmbeddedAtom", f:parsenoop },
	0x1014: { n:"RT_AnimationInfo", f:parsenoop },
	0x1015: { n:"RT_RtfDateTimeMetaCharAtom", f:parsenoop },
	0x1018: { n:"RT_ExternalHyperlinkFlagsAtom", f:parsenoop },
	0x1388: { n:"RT_ProgTags", f:parse_ProgTags$ },
	0x1389: { n:"RT_ProgStringTag", f:parsenoop },
	0x138A: { n:"RT_ProgBinaryTag", f:parsenoop },
	0x138B: { n:"RT_BinaryTagDataBlob", f:parsenoop },
	0x1770: { n:"RT_PrintOptionsAtom", f:parsenoop },
	0x1772: { n:"RT_PersistDirectoryAtom", f:parse_PersistDirectoryAtom },
	0x177A: { n:"RT_PresentationAdvisorFlags9Atom", f:parsenoop },
	0x177B: { n:"RT_HtmlDocInfo9Atom", f:parsenoop },
	0x177C: { n:"RT_HtmlPublishInfoAtom", f:parsenoop },
	0x177D: { n:"RT_HtmlPublishInfo9", f:parsenoop },
	0x177E: { n:"RT_BroadcastDocInfo9", f:parsenoop },
	0x177F: { n:"RT_BroadcastDocInfo9Atom", f:parsenoop },
	0x1784: { n:"RT_EnvelopeFlags9Atom", f:parsenoop },
	0x1785: { n:"RT_EnvelopeData9Atom", f:parsenoop },
	0x2AFB: { n:"RT_VisualShapeAtom", f:parsenoop },
	0x2B00: { n:"RT_HashCodeAtom", f:parsenoop },
	0x2B01: { n:"RT_VisualPageAtom", f:parsenoop },
	0x2B02: { n:"RT_BuildList", f:parsenoop },
	0x2B03: { n:"RT_BuildAtom", f:parsenoop },
	0x2B04: { n:"RT_ChartBuild", f:parsenoop },
	0x2B05: { n:"RT_ChartBuildAtom", f:parsenoop },
	0x2B06: { n:"RT_DiagramBuild", f:parsenoop },
	0x2B07: { n:"RT_DiagramBuildAtom", f:parsenoop },
	0x2B08: { n:"RT_ParaBuild", f:parsenoop },
	0x2B09: { n:"RT_ParaBuildAtom", f:parsenoop },
	0x2B0A: { n:"RT_LevelInfoAtom", f:parsenoop },
	0x2B0B: { n:"RT_RoundTripAnimationAtom12Atom", f:parsenoop },
	0x2B0D: { n:"RT_RoundTripAnimationHashAtom12Atom", f:parsenoop },
	0x2EE0: { n:"RT_Comment10", f:parsenoop },
	0x2EE1: { n:"RT_Comment10Atom", f:parsenoop },
	0x2EE4: { n:"RT_CommentIndex10", f:parsenoop },
	0x2EE5: { n:"RT_CommentIndex10Atom", f:parsenoop },
	0x2EE6: { n:"RT_LinkedShape10Atom", f:parsenoop },
	0x2EE7: { n:"RT_LinkedSlide10Atom", f:parsenoop },
	0x2EEA: { n:"RT_SlideFlags10Atom", f:parsenoop },
	0x2EEB: { n:"RT_SlideTime10Atom", f:parsenoop },
	0x2EEC: { n:"RT_DiffTree10", f:parsenoop },
	0x2EED: { n:"RT_Diff10", f:parsenoop },
	0x2EEE: { n:"RT_Diff10Atom", f:parsenoop },
	0x2EEF: { n:"RT_SlideListTableSize10Atom", f:parsenoop },
	0x2EF0: { n:"RT_SlideListEntry10Atom", f:parsenoop },
	0x2EF1: { n:"RT_SlideListTable10", f:parsenoop },
	0x2F14: { n:"RT_CryptSession10Container", f:parsenoop },
	0x32C8: { n:"RT_FontEmbedFlags10Atom", f:parsenoop },
	0x36B0: { n:"RT_FilterPrivacyFlags10Atom", f:parsenoop },
	0x36B1: { n:"RT_DocToolbarStates10Atom", f:parsenoop },
	0x36B2: { n:"RT_PhotoAlbumInfo10Atom", f:parsenoop },
	0x36B3: { n:"RT_SmartTagStore11Container", f:parsenoop },
	0x3714: { n:"RT_RoundTripSlideSyncInfo12", f:parsenoop },
	0x3715: { n:"RT_RoundTripSlideSyncInfoAtom12", f:parsenoop },
	0x6969: { n:"RT_SheetJSAtom", f:parsenoop },
	0xF125: { n:"RT_TimeConditionContainer", f:parsenoop },
	0xF127: { n:"RT_TimeNode", f:parsenoop },
	0xF128: { n:"RT_TimeCondition", f:parsenoop },
	0xF129: { n:"RT_TimeModifier", f:parsenoop },
	0xF12A: { n:"RT_TimeBehaviorContainer", f:parsenoop },
	0xF12B: { n:"RT_TimeAnimateBehaviorContainer", f:parsenoop },
	0xF12C: { n:"RT_TimeColorBehaviorContainer", f:parsenoop },
	0xF12D: { n:"RT_TimeEffectBehaviorContainer", f:parsenoop },
	0xF12E: { n:"RT_TimeMotionBehaviorContainer", f:parsenoop },
	0xF12F: { n:"RT_TimeRotationBehaviorContainer", f:parsenoop },
	0xF130: { n:"RT_TimeScaleBehaviorContainer", f:parsenoop },
	0xF131: { n:"RT_TimeSetBehaviorContainer", f:parsenoop },
	0xF132: { n:"RT_TimeCommandBehaviorContainer", f:parsenoop },
	0xF133: { n:"RT_TimeBehavior", f:parsenoop },
	0xF134: { n:"RT_TimeAnimateBehavior", f:parsenoop },
	0xF135: { n:"RT_TimeColorBehavior", f:parsenoop },
	0xF136: { n:"RT_TimeEffectBehavior", f:parsenoop },
	0xF137: { n:"RT_TimeMotionBehavior", f:parsenoop },
	0xF138: { n:"RT_TimeRotationBehavior", f:parsenoop },
	0xF139: { n:"RT_TimeScaleBehavior", f:parsenoop },
	0xF13A: { n:"RT_TimeSetBehavior", f:parsenoop },
	0xF13B: { n:"RT_TimeCommandBehavior", f:parsenoop },
	0xF13C: { n:"RT_TimeClientVisualElement", f:parsenoop },
	0xF13D: { n:"RT_TimePropertyList", f:parsenoop },
	0xF13E: { n:"RT_TimeVariantList", f:parsenoop },
	0xF13F: { n:"RT_TimeAnimationValueList", f:parsenoop },
	0xF140: { n:"RT_TimeIterateData", f:parsenoop },
	0xF141: { n:"RT_TimeSequenceData", f:parsenoop },
	0xF142: { n:"RT_TimeVariant", f:parsenoop },
	0xF143: { n:"RT_TimeAnimationValue", f:parsenoop },
	0xF144: { n:"RT_TimeExtTimeNodeContainer", f:parsenoop },
	0xF145: { n:"RT_TimeSubEffectContainer", f:parsenoop },

	0xF00D: { n:"OfficeArtClientTextbox", f:parse_OfficeArtClientTextbox },

	/* [MS-ODRAW] uses the same record format */
	0xF002: { n:"OfficeArtDgContainer", f:parse_OfficeArtDgContainer },
	0xF003: { n:"OfficeArtSpgrContainer", f:parse_OfficeArtSpgrContainer },
	0xF004: { n:"OfficeArtSpContainer", f:parse_OfficeArtSpContainer },
	0xF008: { n:"OfficeArtFDG", f:parse_OfficeArtFDG },
	0xF009: { n:"OfficeArtFSPGR", f:parse_OfficeArtFSPGR },
	0xF00A: { n:"OfficeArtFSP", f:parse_OfficeArtFSP },
	0xF00B: { n:"OfficeArtFOPT", f:parse_OfficeArtFOPT },
	0xF122: { n:"OfficeArtTertiaryFOPT", f:parse_OfficeArtTertiaryFOPT },
	
	0xF010: { n:"OfficeArtFSPGR", f:parse_OfficeArtFSPGR },
	0xF011: { n:"OfficeArtFSPGR", f:parse_OfficeArtFSPGR },

	0xFC1C: { n:"RT_MagicAtom", f:parsenoop }	
}

function process_ppt(ppt) {
	var opts = {};

	/* 2.1.1 Current User Stream */
	var custream = ppt.find('Current User');
	var cublob = custream.content;

	var cu;
	recordhopper(cublob, function pptdoc1(R, val, len) {
		if(cu) throw "unexpected second RT_CurrentUserAtom in Current User stream";
		cu = val;
	}, cublob.length, {
		records: ['RT_CurrentUserAtom']
	});

	/* 2.1.2 PowerPoint Document Stream */
	var pptstream = ppt.find('PowerPoint Document');
	var pptblob = pptstream.content;

	var persist;

	/* first pass: build up persist directory first */
	recordhopper(pptblob, function pptdoc2(R, val, len) {
		if(R.n === 'RT_PersistDirectoryAtom') {
			if(persist) throw "unexpected second RT_PersistDirectoryAtom";
			persist = val;
		}
	}, pptblob.length, {
		records: ['RT_PersistDirectoryAtom']
	});

	opts.persist = persist;

	/* second pass */
	pptblob.l = 0;
	recordhopper(pptblob, function pptdoc3(R, val, len) {
		switch(R.n) {
			case 'RT_Slide': break;
			case 'RT_Document': break;
			case 'RT_Notes': break
			case 'RT_MainMaster': break;

			case 'RT_PersistDirectoryAtom': break;
			case 'RT_UserEditAtom': break;
			default: throw R.n; break;
		}
	}, pptblob.length, opts);
}

function readFile(filename) {
	var ppt = CFB.read(filename, {type:'file'});
	return process_ppt(ppt);
}

module.exports = {
	parse_pptcfb: process_ppt,
	readFile: readFile
};
