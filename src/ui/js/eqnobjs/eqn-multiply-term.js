function TermMultiply(config) {
  TermMultiply.parent.call(this, config);

  this.type = 1;
}
inherit(TermBracket, TermMultiply, {

  key : "TermMultiply",

  init : function() {
    this.coeff = this.coeff || 1;
    var terms = this.terms;
    this.terms = [];
    for(var i = 0; i < terms.length; i++) {
      this.coeff *= terms[i].coeff;
      if(terms[i].type === 1) {
        for(var j = 0; j < terms[i].terms.length; j++) {
          terms[i].terms[j].coeff = 1;
          this.terms.push(terms[i].terms[j]);
        }
      }
      else {
        terms[i].coeff = 1;
        this.terms.push(terms[i]);
      }
    }
    this.terms.sort(Term.sortFun);
  },

  parse : function(tokens) {
    var t = tokens.next(), ct;
    if(this.terms.length === 0) {
      if(t === "-") this.coeff = -this.coeff;
      else if(t === "/") this.pwr = -this.pwr;
      t = tokens.next();
      if(NUMBER_REGEX.exec(t)) this.coeff *= Number(t);
      else tokens.back();
    }
    else tokens.back();
    while(!tokens.isEmpty()) {
      ct = new Term({}).parse(tokens);
      this.addTerm(ct);
      t = tokens.next();
      if(t === "+" || t === "-" || t === ")") {
        tokens.back();
        return this;
      }
      else if(t) tokens.back();
    }
    return this;
  },

  addTerm : function(term) {
    if(term.var || !term.terms || term.pwr !== 1) {
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].equalTo(term, "true") === 1) {
          this.terms[i].pwr += term.pwr;
          if(this.terms[i].pwr === 0) {
            this.terms.splice(i, 1);
          }
          return;
        }
      }
      if(term.var || term.terms) {
        this.terms.push(term);
        this.terms.sort(Term.sortFun);
      }
      if(term.pwr >= 0) this.coeff *= term.coeff;
      else this.coeff /= term.coeff;
      term.coeff = 1;
    }
    else if(term.type === 1) {
      for(var i = 0; i < term.terms.length; i++) {
        this.addTerm(term.terms[i]);
      }
      if(term.pwr >= 0) this.coeff *= term.coeff;
      else this.coeff /= term.coeff;
      term.coeff = 1;
      term.terms = [];
    }
    else {
      this.terms.push(term);
      this.terms.sort(Term.sortFun);
      if(term.pwr >= 0) this.coeff *= term.coeff;
      else this.coeff /= term.coeff;
      term.coeff = 1;
    }
  },

  equalTo : function(term, typeOnly) {
    if(this.sortStr && term.sortStr) {
      if(this.sortStr === term.sortStr) return 1;
    }
    else if(term.terms && this.terms.length === term.terms.length) {
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].equalTo(term.terms[i], typeOnly) === 0) {
          return 0;
        }
      }
      return 1;
    }
    return 0;
  },

  power : function(pwr, sterm) {
    if(pwr !== 0) {
      this.coeff = Math.pow(this.coeff, pwr);
      for(var i = 0; i < this.terms.length; i++) {
        this.terms[i].power(pwr, sterm);
      }
      this.pwr = 1;
      return this;
    }
    return null;
  },

  simplify : function(sterm) {
    var terms = this.terms;
    this.terms = [];
    for(var i = 0; i < terms.length; i++) {
      terms[i] = terms[i].simplify(sterm);
      if(terms[i] && (terms[i].var || terms[i].terms || terms[i].coeff !== 1 || terms[i].pwr !== 1)) {
        if(!terms[i].var && !terms[i].terms) this.coeff *= terms[i].coeff;
        else this.addTerm(terms[i]);
      }
    }
    if(this.terms.length === 0) return new Term({coeff : this.coeff});

    var t = this.condense(),
        mts = [], stm = new TermMultiply({terms : []}), bt = null;
    if(!t.terms) return t;
    for(var i = 0; i < t.terms.length; i++) {
      if(t.terms[i].type === 0 || t.terms[i].pwr !== 1 || t.terms[i].hasSTerm(sterm) === 0) {
        stm.addTerm(t.terms[i]);
      }
      else {
        if(!bt) bt = t.terms[i];
        else mts.push(t.terms[i]);
      }
    }
    if(bt) {
      for(var i = 0; i < bt.terms.length; i++) {
        bt.terms[i].coeff *= this.coeff;
      }
    }
    if(stm.terms.length !== 0) {
      if(!bt) {
        return t;
      }

      bt.multiply(stm, sterm);
    }

    for(var i = 0; i < mts.length; i++) {
      bt.multiply(mts[i], sterm);
    }

    //bt.coeff = this.coeff;
    bt = bt.simplify(sterm);
    if(bt.terms.length === 1) {
      bt.terms[0].coeff *= bt.coeff;
      return bt.terms.pop();
    }
    if(bt.terms.length === 0) return null;

    return bt;
  },

  condense : function() {
    this.sortAndStringify();
    var terms = this.terms;
    this.terms = [];
    for(var i = 0; i < terms.length - 1; i++) {
      if(terms[i] === 0) continue;
      for(var j = i + 1; j < terms.length; j++) {
        if(terms[j] === 0) continue;
        if(terms[i].equalTo(terms[j]) === 1) {
          terms[i].pwr += terms[j].pwr;
          terms[j] = 0;
        }
      }
      if(terms[i].pwr !== 0) {
        if(terms[i]) {
          this.addTerm(terms[i]);
          this.coeff *= terms[i].coeff;
          terms[i].coeff = 1;
        }
      }
    }
    if(terms[terms.length - 1] !== 0) this.addTerm(terms[terms.length - 1]);
    if(this.terms.length === 1) {
      this.terms[0].coeff *= this.coeff;
      return this.terms.pop();
    }
    if(this.terms.length === 0) return null;
    return this;
  },

  multiply : function(term, sterm) {
    if(term.type === 2) return term.multiply(this, sterm);
    var ts = (term.terms ? term.terms:[term]);
    for(var i = 0; i < ts.length; i++) {
      this.addTerm(ts[i]);
    }
    this.coeff *= term.coeff;
    return this;
  },

  copy : function() {
    var c = new TermMultiply({pwr : this.pwr, coeff : this.coeff, terms : []});
    for(var i = 0; i < this.terms.length; i++) {
      c.addTerm(this.terms[i].copy());
    }
    return c;
  },

  replace : function(term, withTerm) {
    for(var i = 0; i < this.terms.length; i++) {
      this.terms[i] = this.terms[i].replace(term, withTerm);
    }
    return this;
  },

  segregate : function(term, pwr) {
    var t = null;
    for(var i = 0; i < this.terms.length; i++) {
      if(this.terms[i].var === term.var && (!pwr || this.terms[i].pwr >= pwr)) {
        if(pwr && this.terms[i].pwr > pwr) {
          t = this.terms[i].copy();
          t.pwr = pwr;
          t.coeff = 1;
          this.terms[i].pwr -= pwr;
        }
        else {
          t = this.terms[i];
          this.terms.splice(i, 1);
        }
        break;
      }
    }
    return [t, this];
  },

  hasSTerm : function(sterm) {
    if(!sterm) return 1;
    for(var i = 0; i < this.terms.length; i++) {
      if(this.terms[i].hasSTerm(sterm) === 1) return 1;
    }
    return 0;
  },

  convertToString : function () {
    var str = (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"");
    for(var i = 0; i < this.terms.length; i++) {
      var s = this.terms[i].convertToString();
      if(s != "1") str += ""+s;
    }
    if(this.pwr && this.pwr !== 1) str += "^"+this.pwr;
    return str;
  },

  processForFactorization : function(termHeap, termRef, termsMeta, seperate) {
    var brackets = 0;
    for(var i = 0; i < this.terms.length; i++) {
      this.terms[i].processForFactorization(termHeap, termRef, termsMeta, 0);
      if(this.terms[i].type === 2) {
        brackets++;
      }
    }

    //TODO : support brackets also - use sortStr instead of var
    if(brackets === 0) {
      //possible term sets
      var pts = this._generatePossibleTermAndPowerPairs(this.terms);
      for(var i = 0; i < pts.length; i++) {
        var btkey = "", tkey = [], pwr = 0, terms = [], pwrOfTerms = 0,
            termToPwrMap = {};
        for(var j = 0; j < pts[i].length; j++) {
          var term = pts[i][j][0];
          terms.push(term);
          btkey += term.var+"--"+term.pwr+"__";
          tkey.push(term.var+"--"+(term.pwr * pts[i][j][1]));
          termToPwrMap[term.var] = term.pwr;
          pwr += pts[i][j][1];
          pwrOfTerms += term.pwr;
        }
        btkey += pwr;
        tkey = tkey.join("__");
        if(!termRef[1].btref[btkey]) {
          var bt = {tref : {}, href : [1 - pwrOfTerms - pwr, 1, btkey], terms : terms, pwr : pwr},
              bts = this._generateTermsForPower(terms, [], pwr),
              _tkeys = [], _tkeysToAd = [], present = 0;
          for(var j = 0; j < bts.length; j++) {
            var _terms = bts[j], _pwrs = [],
                _tkey = [];
            for(var k = 0; k < _terms.length; k++) {
              if(_terms[k].pwr > 0) _tkey.push(_terms[k].var+"--"+_terms[k].pwr);
              _pwrs.push(_terms[k].pwr / termToPwrMap[_terms[k].var]);
            }
            _tkey = _tkey.join("__");
            bt.tref[_tkey] = [0, 0, MathUtils.coeffsForRaiseToPwr.getCoeffForAPwrSet(pwr, _pwrs)];
            if(termRef[1].tref[_tkey] && termRef[1].tref[_tkey].coeff) {
              bt.tref[_tkey][0] = 1;
              bt.tref[_tkey][1] += termRef[1].tref[_tkey].coeff;
              if(termRef[1].tref[_tkey].coeff === bt.tref[_tkey][2]) {
                bt.href[0] += pwr;
              }
              present++;
            }
            else {
              _tkeysToAd.push({tkey : _tkey, terms : _terms});
            }
            _tkeys.push(_tkey);
          }
          if(bt.href[0] + (_tkeys.length - present + termsMeta.termsLeft) * pwr > 0) {
            termRef[1].btref[btkey] = bt;
            for(var j = 0; j < _tkeysToAd.length; j++) {
              termRef[1].tref[_tkeysToAd[j].tkey] = {bts : [], terms : _tkeysToAd[j].terms};
            }
            for(var j = 0; j < _tkeys.length; j++) {
              termRef[1].tref[_tkeys[j]].bts.push(bt);
            }
          }
          Math.heap.insert(termHeap, bt.href, TermBracket.heapcmp);
        }
        if(termRef[1].tref[tkey]) {
          for(var j = 0; j < termRef[1].tref[tkey].bts.length; j++) {
            var p = termRef[1].tref[tkey].bts[j];
            p.tref[tkey][0] = 1;
            p.tref[tkey][1] += this.coeff;
            if(this.coeff === p.tref[tkey][2]) p.href[0] += pwr;
            Math.heap.modified(termHeap, p.href, TermBracket.heapcmp);
          }
          termRef[1].tref[tkey].coeff = this.coeff;
        }
      }
    }
  },

  factorize : function(sterm) {
    for(var i = 0; i < this.terms.length;) {
      var rett = this.terms[i].factorize(sterm);
      if(this.terms[i].type === 2) {
        if(rett.type !== 2) {
          this.terms.splice(i, 1);
          this.addTerm(rett);
        }
        else {
          this.terms[i] = rett;
          i++;
        }
      }
      else {
        this.terms[i] = rett;
        i++;
      }
    }
    return this;
  },

  getVars : function(varRef) {
    for(var i = 0; i < this.terms.length; i++) {
      this.terms[i].getVars(varRef);
    }
  },

  getCode : function () {
    var str = (this.coeff && this.coeff !== 1 ? this.coeff+"*":"");
    for(var i = 0; i < this.terms.length; i++) {
      var s = this.terms[i].getCode();
      if(s != "1") {
        str += ""+s;
        if(this.terms.length > 1 && i < this.terms.length - 1) str += "*";
      }
    }
    if(this.pwr && this.pwr !== 1) str = "Math.pow(" + str +", " + this.pwr + ")";
    return str;
  },

  sortAndStringify : function() {
    this.fullStr = (this.coeff && this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")": this.coeff):"");
    this.sortStr = "";
    for(var i = 0; i < this.terms.length; i++) {
      this.terms[i].sortAndStringify();
    }
    this.terms.sort(TermBracket.sort_fun);
    for(var i = 0; i < this.terms.length; i++) {
      if(this.terms[i].fullStr != "1") this.sortStr += this.terms[i].fullStr;
    }
    if(this.pwr && this.pwr !== 1) this.sortStr += "^"+this.pwr;
    this.fullStr += this.sortStr;
  },

});
