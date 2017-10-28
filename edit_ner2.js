var gNbPts // nb de points créés
	,gPtCourant, PtCourant // point courant
	,gNCourante // niche courante (0 = fond)
	,gNiches=[] // niches (suite des id formant chaque niche)
	,canvasNER, ctx, paramW
	,gImgFond = null,
	gAlignEnCours='';
	
var gProcessor = null;	// required by OpenJScad.org
//var edit_code;

var gPf = ['h','l','w'],
	gNd = 'NER',
	gRegleVisible;
	
const cClasseNicheCourante = "nicheCourante",
	cClassePt1 = "pt1", cClassePtZ = "ptZ",
	cClasseCourbe = "courbe";
	
$(document).ready(function() {
	$( "#bt_test" ).button({icons: { primary: "ui-icon-disk"}});

	$("#editHandle").click(function() {
        if ($("#ner_ed").width() == 0) {
			$("#ner_ed").css("width",'45%');
			$("#menu").show();
			$("#editHandle").attr('src',"imgs/editHandleIn.png");
        } else {
			$("#ner_ed").css("width",'0px');
			$("#menu").hide();
			$("#editHandle").attr('src',"imgs/editHandleOut.png");
		}
	});
});
function init(){
	gNbPts = 0; gPtCourant = null; PtCourant = null;
	gNCourante = 0; gNiches[gNCourante]=[];
	$("#bt_supprimePt").prop('disabled', true);
	canvasNER = $("#canvasNER"); ctx = canvasNER[0].getContext('2d');
	var edit_code = $("#zone_code").val();		
	var vc = document.getElementById('viewerContext');
	gProcessor = new OpenJsCad.Processor(vc);	
	gProcessor.setJsCad(edit_code, 'ner.jscad');
	//gProcessor.viewer.plate.draw = false;		
	gProcessor.viewer.axis.draw = true;
	paramW = document.getElementsByName("w")[0];
	paramW.style.visibility = "hidden";	
	$("#lst_niches").change(function(){edit_niches(this.options[this.selectedIndex].id);});	
	gRegleVisible = true;
	ajouteRe("re0", 200,400);
	ajouteRe("re1", 400,400);
	pos0 = $("#re0").offset();
	pos1 = $("#re1").offset();
	posM = {top:(pos0.top+pos1.top)/2, left:(pos0.left+pos1.left)/2};
	ajouteBz("re0re1_0",pos0,posM, "re0", true);
	ajouteBz("re0re1_1",pos1,posM, "re1", true);
	basculeRegle();
}
function inserePt(){	
	if(gPtCourant !== null){
		// cherche le pt suivant
		n = gNiches[gNCourante].indexOf(gPtCourant.id);
		n2 = (n == gNiches[gNCourante].length-1) ? 0 : n+1;
		pos1 = ofsCanvas($('#'+ gPtCourant.id).offset());
		pos2 = ofsCanvas($('#'+ gNiches[gNCourante][n2]).offset());
		rel = ofsCanvas($('#ner_ed').offset());
		lx = (pos1.left+pos2.left)/2 - rel.left;
		ly = (pos1.top+pos2.top)/2 - rel.top;
		np = ajoutePt(null, lx, ly);
		// Supprime les beziers s'ils existent
		chNom = nomme2Pts(gPtCourant.id, gNiches[gNCourante][n2]);
		console.log(chNom);
		$('#'+chNom+'_0').remove();
		$('#'+chNom+'_1').remove();
		gNiches[gNCourante].splice(n+1,0,np);
		MAJ();
	}
}
function basculeRegle(){
	gRegleVisible = !gRegleVisible;
	$("#re0").toggle();
	$("#re1").toggle();
	$("#re0re1_0").toggle();
	$("#re0re1_1").toggle();	
	MAJ();
}
function exporte(){	
    var nom = prompt("Nom du fichier ?", gNd);

	if (nom != null) {
		that = document.getElementById('tfa_src_data');
		var fP = {};
		for(var i in gPf)
		  fP[gPf[i]] = document.getElementsByName(gPf[i])[0].value;
		
		csv = JSON.stringify(fP);
		var csvData = 'data:application/csv;charset=utf-8,' 
			+ encodeURIComponent(csv);
		that.href = csvData;
		that.target = '_blank';
		that.download = nom + ".dat";
	}
}
function peuple(event){
	var input = event.target;
    var reader = new FileReader();
	
    reader.onload = function(){
		var text = reader.result;
		var fParams = JSON.parse(text);
		var P,i,j,C,ch;
		for(i in gPf){
			P = document.getElementsByName(gPf[i])[0];
			if(typeof(P) !== 'undefined')
				if(typeof(fParams[gPf[i]]) !== 'undefined')
					P.value = fParams[gPf[i]];
		}
		// RAZ interface
		$(".pt").remove(); $(".bz").remove();
		gNiches = []; gNbPts = 0; gPtCourant = null; PtCourant = null;
		resetNiches();
		
		// synchro avec donnees chargees
		var w= JSON.parse(document.getElementsByName('w')[0].value);
		for(i=0;i<w.length;i++){
			switch(w[i][0]){
				case 'p':
					ajoutePt(w[i][1], w[i][2]+10, w[i][3]+33);
					break;
				case 'b':
					ajouteBz2(w[i][1], w[i][2]+10, w[i][3]+33, w[i][4]);
					break;
				case 'n':          
					ch = w[i][1];
					ajouteNiche(ch.split(','));
			}
		}		
		// envoi vers l'interface graphique !
		MAJ();
		//
		document.getElementById("updateButton").onclick.call();
	};
    reader.readAsText(input.files[0]);
}
function ajouteRe(lid, lx, ly){
	var re = $("<div class='re ui-widget-content'></div>");
	re.draggable({containment:"#zone",scroll:false, cursor:"crosshair", cursorAt:{top:4,left:4}});
	re.mouseup(function(event) {MAJ();});
	re.attr("id", lid);
	re.css({position:"absolute", top:ly +"px", left:lx +"px"});
	re.appendTo("#zone");
}
function AlignePoint(ch){gAlignEnCours = ch;}
function ChangePtCourant(pt){
	var aMaj = false, v,h;
	if(PtCourant !== null){
//		console.log("ChangePtCourant");
		if (gAlignEnCours == 'V') {
			v = $(PtCourant).offset().left - $('#ner_ed').offset().left;
			h = $(pt).offset().top - $('#ner_ed').offset().top;
			aMaj = true;
		} else if (gAlignEnCours == 'H'){
			v = $(pt).offset().left - $('#ner_ed').offset().left;
			h = $(PtCourant).offset().top - $('#ner_ed').offset().top;
			aMaj = true;
		}
		if(aMaj)
			$(pt).css({position:"absolute", left:v + 'px', top:h +'px'});
		gAlignEnCours = '';
	}
	PtCourant = pt; gPtCourant = pt;
	if(aMaj)MAJ();
}
function wwwChargeFond(){
	var input = prompt("Adresse", "");

	if (input != null) {
		gImgFond = new Image();
		gImgFond.src = input;
		MAJ();
	}
}
function ChargeFond(event){
	var input = event.target;
	var file    = input.files[0];
	var reader  = new FileReader();

  reader.addEventListener("load", function () {
    gImgFond = new Image();
	gImgFond.src = reader.result;
	MAJ();
  }, false);

  if (file) {
    reader.readAsDataURL(file);
  }
}
function edit_niches(id){
	switch(id){
		case '+': // AJOUT
			ajouteNiche();
			break;
		case '-': // SUPPRESSION
			break;
		default: // SELECTION
			gNCourante = id;
			MAJ();
	}
}
function ajouteNiche(ch){
	gNiches[gNiches.length] = (ch === undefined) ? []: ch;
	gNCourante = gNiches.length-1;
	if(gNCourante>0){
		$("#SN").before('<option id="'+gNCourante+'">Niche '+gNCourante+'</option>');
	}
	$('#lst_niches option[id="'+gNCourante+'"]').prop('selected', true);	
}
function resetNiches(){
	$('#lst_niches option').each(function(){
		id = parseInt($(this).attr("id"));
		if(id >0)
			$(this).remove();
	});	
}
function nomme2Pts(id1, id2){return id1 < id2 ? id1 + id2 : id2 + id1;}
function ajouteBz(nom, pos0, pos1, id, pourRegle){
	var cl = pourRegle === undefined ? 'bz' : 'bzre';
	var bz = $("<div class='"+cl+" ui-widget-content'></div>");
	bz.draggable({containment:"#zone",scroll:false,
		cursor:"crosshair", cursorAt:{top:3,left:3}});
	bz.mouseup(function(event) {MAJ();});
	bz.attr("id", nom); bz.attr("tag", id);
	
	rel = $('#ner_ed').offset();
	bz.css({position:"absolute",
		top:(pos0.top+pos1.top)/2-rel.top +"px",
		left:(pos0.left+pos1.left)/2-rel.left +"px"});
	bz.appendTo("#zone");
}
function ajouteBz2(lid, lx, ly, lid2){
	var bz = $("<div class='bz ui-widget-content'></div>");
	bz.draggable({containment:"#zone",scroll:false, cursor:"crosshair", cursorAt:{top:3,left:3}});
	bz.mouseup(function(event) {MAJ();});
	bz.attr("id", lid); bz.attr("tag", lid2);
	bz.css({position:"absolute", top:ly +"px", left:lx +"px"});
	bz.appendTo("#zone");
}
function courbePt(){
	var pt = $(gPtCourant), ptsContact =[],i, bz0, bz1, pos0, pos1, posM,chNom;
	
	if(gPtCourant !== null){
		ptsContact = ptsLies(pt[0].id);
		if(pt.hasClass(cClasseCourbe)){
			pt.removeClass(cClasseCourbe);
		}
		else{
			pt.addClass(cClasseCourbe);
			pos0 = pt.offset();
			for(i=0;i<ptsContact.length;i++){				
				pos1 = $('#'+ptsContact[i]).offset();
				posM = {top:(pos0.top+pos1.top)/2, left:(pos0.left+pos1.left)/2};
				chNom = nomme2Pts(pt[0].id, ptsContact[i]);
				// ajoute les points s'ils n'existent pas déjà
				if( $('#'+chNom+'_0').length == 0){
					ajouteBz(chNom+'_0', pos0, posM, pt[0].id);
					ajouteBz(chNom+'_1', pos1, posM, ptsContact[i]);
				}
			}
		}
	}
}
function ptsLies(id){
	var i,j, R = [];
	
	for(i=0;i<gNiches.length;i++){
		n = gNiches[i].indexOf(id);
		if(n>-1){
			R.push(gNiches[i][n>0 ? n-1 : gNiches[i].length-1]);
			R.push(gNiches[i][n< gNiches[i].length-1 ? n+1:0]);
		}
	}
	return R.sort().filter(dedouble);	
}
function dedouble(currentValue, index,arr){
	if(index == 0)
		return true
	else
		return arr[index-1] != currentValue;
}
function ajoutePt(lid, lx, ly){
	var nouveauPt = $("<div class='pt ui-widget-content'></div>"), nid;
	if((lid === undefined)||(lid === null)){
		lid = 'N' + gNbPts;
		nouveauPt.attr("id", lid);
		nouveauPt.attr("tabindex", gNbPts);
		gNbPts++;
	} else{
		nouveauPt.attr("id", lid);
		nid = parseInt(lid.substr(1));
		nouveauPt.attr("tabindex", nid);
		if(nid >=gNbPts)
			gNbPts = nid+1;
	}
	
	if((lx === undefined)||(ly === undefined) ){
		ly = Math.ceil((gNbPts)/10)*10+15;
		lx = ((gNbPts-1) % 10) *10+2;
	}		
	nouveauPt.css({position:"absolute", top: ly+"px", left: lx+"px"});
		
	nouveauPt.draggable({containment: "#zone",scroll: false, cursor: "crosshair", cursorAt: { top: 4, left: 4 }});
	nouveauPt.mousedown(function(event) {
		gPtCourant = $(this);
		$("#bt_supprimePt").prop('disabled', false);
		ChangePtCourant(event.target);
	});

	nouveauPt.mouseup(function(event) {		
		MAJ();
	});
	
	nouveauPt.dblclick(function (e) {
		var pt = $(this), i = pt.attr('id'), j;
	
		if(pt.hasClass(cClasseNicheCourante)){
			j = gNiches[gNCourante].indexOf(i);
			if (j > -1) {
				gNiches[gNCourante].splice(j, 1);
				pt.removeClass(cClasseNicheCourante+" "+cClassePt1+" "+cClassePtZ);
			}
		}
		else{
			pt.addClass(cClasseNicheCourante);
			gNiches[gNCourante].push(i);
		}
		MAJ();
	});
	
	nouveauPt.appendTo("#zone");
	return lid;
}
function supprimePt(){
	if(gPtCourant !== null){
		$(gPtCourant).remove();
		gPtCourant = null;
		$("#bt_supprimePt").prop('disabled', true);  
	}
}
function ofsCanvas(pt){
	var cp = canvasNER.offset();
	return {left:pt.left-cp.left, top:pt.top-cp.top};
}
function MAJ(){
	var i,j, jj, n, P, p, niche, npos, bz, pos0,pos1, w=[];
			
	// EFFACE L'EXISTANT
	ctx.clearRect(0, 0, canvasNER[0].width, canvasNER[0].height);
	
	if(gImgFond != null){
		ctx.save();
		ctx.globalAlpha = 0.4;
		ctx.drawImage(gImgFond,0,0,gImgFond.width,gImgFond.height,0, 0, canvasNER[0].width, canvasNER[0].height);
		ctx.restore();
	}
	
	// materialise la regle
	if(gRegleVisible){
		re0 = ofsCanvas($("#re0").offset());
		re1 = ofsCanvas($("#re1").offset());
		ctx.lineWidth = 10;
		ctx.fillStyle = 'red';
		ctx.strokeStyle = 'red';
		ctx.beginPath();	
		ctx.moveTo(re0.left+5, re0.top+5);	
		pos0= ofsCanvas($('#re0re1_0').offset());
		pos1= ofsCanvas($('#re0re1_1').offset());
		ctx.bezierCurveTo(pos0.left+3, pos0.top+3
			, pos1.left+3, pos1.top+3
			, re1.left+5, re1.top+5);
		ctx.stroke();
	}
	
	ctx.beginPath();
	for(i=0;i<gNiches.length;i++){
		for(j=0;j<gNiches[i].length;j++){
			niche = $("#"+ gNiches[i][j]);
			niche.removeClass(cClasseNicheCourante+" "+cClassePt1+" "+cClassePtZ);
		}
	}
	// DESSINE A PARTIR DES DONNEES
	for(i=0;i<gNiches.length;i++){
		P =[];
		for(j=0;j<gNiches[i].length;j++){
			niche = $("#"+ gNiches[i][j]);
			if(i == gNCourante){
				niche.addClass(cClasseNicheCourante);
				if(j==0)niche.addClass(cClassePt1);
				if(j==gNiches[i].length-1)niche.addClass(cClassePtZ);
			}
			p = ofsCanvas(niche.offset());
			P.push({x:p.left+5, y:p.top+5, id:niche.attr('id')});			
		}
		if(P.length >0){
			ctx.lineWidth = i== 0 ?4 : 10;
			ctx.strokeStyle = 'tan';
			ctx.fillStyle = i == 0 ? 'rgba(210, 180, 140, 0.5)' : 'rgba(255, 255, 255, 0.5)';
			ctx.lineJoin = "round";
			ctx.beginPath();
			ctx.moveTo(P[0].x, P[0].y);
			for(j=1;j<=P.length;j++){
				jj = j<P.length ?j :0;
				bz = nomme2Pts(P[j-1].id, P[jj].id);
				//console.log(j-1, jj, bz);
				if($('#'+bz+'_0').length ==0){
					ctx.lineTo(P[jj].x, P[jj].y);
				}else{					
					if($('#'+bz+'_0').attr('tag') == P[j-1].id)
						npos = 0
					else 
						npos = 1;
					pos0= ofsCanvas($('#'+bz+'_'+npos).offset());
					pos1= ofsCanvas($('#'+bz+'_'+(1-npos)).offset());					
					ctx.bezierCurveTo(pos0.left+3, pos0.top+3
						, pos1.left+3, pos1.top+3
						, P[jj].x, P[jj].y);
				}
			}				
			ctx.fill();
			ctx.closePath();
			ctx.stroke();
			
			// matérialise les pts de ctrl des courbes
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'black';
			ctx.beginPath();		
			$(".bz").each(function(index){
				bz = $(this);
				pt = $("#"+bz.attr('tag'));
				bp = ofsCanvas(bz.offset());
				pp = ofsCanvas(pt.offset());
				ctx.moveTo(bp.left+3, bp.top+3);
				ctx.lineTo(pp.left+5, pp.top+5);
			});
			ctx.closePath();
			ctx.stroke();			
		}
	}
	
	// prepare export
	$(".pt").each(function(index){
		p = $(this); pp = ofsCanvas(p.offset());
		w.push(['p', p.attr('id'), pp.left, pp.top]);
	});
	$(".bz").each(function(index){
		p = $(this); pp = ofsCanvas(p.offset());
		w.push(['b', p.attr('id'), pp.left, pp.top, p.attr('tag')]);
	});
	for(i=0;i<gNiches.length;i++){
		w.push(['n', gNiches[i].join()]);
	}
	//console.table(w);	
	paramW.value = JSON.stringify(w);
}