function TermBracket(config) {
  TermBracket.parent.call(this, config);
}
TermBracket.strcmp = function(a, b) {return a.length === b.length ? (a > b ? 1 : -1) : (a.length > b.length ? 1 : -1)};
TermBracket.strcmp1 = function(a, b) {return a.length === b.length ? (a == b ? 0 : (a > b ? 1 : -1)) : (a.length > b.length ? 1 : -1)};
TermBracket.heapcmp = function(a, b) {
  if(a[0] === b[0]) {
    return TermBracket.strcmp1(a[1], b[1]);
  }
  return a[0] - b[0]; 
};
//TermBracket.sort_fun = function(a, b) {return TermBracket.strcmp(a.sortStr, b.sortStr)};
TermBracket.sort_fun = function(a, b) {return (a > b ? 1 : -1)};
inherit(Term, TermBracket, {

  key : "TermBracket",

  init : function() {
    this.type = 2;
  },

  parse : function(tokens) {
    var t = tokens.next(), ct;
    if(operators[t]) {
      if(t === "-") this.coeff = -this.coeff;
      else if(t === "/") this.pwr = -this.pwr;
      t = tokens.next();
    }
    else tokens.back();
    while(!tokens.isEmpty()) {
      t = tokens.next();
      if(t === "(") {
        //tokens.back();
        ct = new TermBracket({terms : []}).parse(tokens);
      }
      else {
        tokens.back();
        ct = new Term({}).parse(tokens);
      }
      t = tokens.next();
      if(t === "*" || t === "/") {
        tokens.back();
        this.addTerm(new TermMultiply({terms : [ct]}).parse(tokens));
      }
      else {
        tokens.back();
        this.addTerm(ct);
      }
      t = tokens.next();
      if(t === ")") break;
      if(!t) return this;
      tokens.back();
    }
    t = tokens.next();
    if(t === "^") {
      this.pwr = Number(tokens.next());
    }
    else if(t) {
      tokens.back();
    }
    return this;
  },

  equalTo : function(term) {
    if(this.sortStr && term.sortStr) {
      if(this.sortStr !== term.sortStr) return 0;
    }
    else if(term.type !== 2 || this.terms.length !== term.terms.length) {
      return 0;
    }
    else {
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].equalTo(term.terms[i]) === 0) {
          return 0;
        }
      }
    }
    return 1;
  },

  addTerm : function(term) {
    if(term.type === 2 && term.pwr === 1) {
      for(var i = 0; i < term.terms.length; i++) {
        this.terms.push(term.terms[i]);
        term.terms[i].coeff *= term.coeff;
      }
    }
    else {
      this.terms.push(term);
    }
  },

  //TODO : calculate (a1+a2+....ar)^n = Sigma (n!/(p1!*p2!...pr!)) a1^p1 * a2^p2 * .... a^n*p^n, p1+p2+...pr = n
  //       no of terms = n+r-1Cn
  power : function(pwr, sterm, dontRaisePwr) {
    var ncr = 1, ts = this.terms,
        st, mt, terms = [],
        br = 0, stf = 0;

    if(pwr === 0) return null;

    for(var i = 0; i < ts.length; i++) {
      if(ts[i].hasSTerm(sterm) === 1) {
        terms.unshift(ts[i]);
        stf = 1;
      }
      else terms.push(ts[i]);
    }
    if(stf === 0) {
      if(!dontRaisePwr) this.pwr *= pwr;
      return this;
    }
    st = terms.shift();

    this.terms = [];
    if(terms.length !== 1) {
      mt = new TermBracket({terms : terms});
      br = 1;
    }
    else {
      mt = terms.shift();
    }
    for(var i = 0; i <= pwr; i++) {
      var sti = st.copy(), mti = mt.copy();
      sti = sti.power(pwr - i, sterm);
      mti = mti.power(i, sterm);
      var ct = sti || mti;
      if(sti && mti) ct = ct.multiply(mti);
      ct.coeff *= ncr;
      ct = ct.condense();
      this.addTerm(ct);
      ncr *= (pwr - i)/(i + 1);
    }
    this.pwr = 1;
    return this.condense();
  },

  simplify : function(sterm) {
    var terms = this.terms;
    this.terms = [];
    for(var i = 0; i < terms.length; i++) {
      terms[i] = terms[i].simplify(sterm);
      if(terms[i]) this.addTerm(terms[i]);
    }
    var t = this.condense();
    if(t && t.type > 0 && t.pwr !== 1) {
      t = t.power(t.pwr, sterm, 1);
    }

    return t;
  },

  condense : function() {
    this.sortAndStringify();
    var terms = this.terms;
    this.terms = [];
    for(var i = 0; i < terms.length - 1; i++) {
      if(terms[i] === 0) continue;
      for(var j = i + 1; j < terms.length; j++) {
        if(terms[j] === 0) continue;
        if(terms[i].add(terms[j]) !== 0) {
          terms[j] = 0;
        }
      }
      if(terms[i].coeff !== 0) {
        this.addTerm(terms[i]);
      }
    }
    if(terms[terms.length - 1] !== 0) this.addTerm(terms[terms.length - 1]);

    if(this.terms.length === 1) {
      this.terms[0].coeff *= this.coeff;
      if(this.pwr !== 1) this.terms[0].pwr = this.pwr;
      return this.terms.pop();
    }
    else {
      var hcf = this.terms[0].coeff;;
      for(var i = 1; i < this.terms.length && hcf !== 1; i++) {
        hcf = Math.hcf(hcf, this.terms[i].coeff);
      }
      if(hcf !== 1) {
        for(var i = 0; i < this.terms.length && hcf !== 1; i++) {
          this.terms[i].coeff /= hcf;
        }
        this.coeff *= hcf;
      }
      return this;
    }
    return null;
  },

  multiply : function(term, sterm) {
    if(term.type < 2) {
      for(var i = 0; i < this.terms.length; i++) {
        this.terms[i] = this.terms[i].multiply(term, sterm);
      }
    }
    else {
      var terms = this.terms;
      this.terms = [];
      for(var i = 0; i < terms.length; i++) {
        for(var j = 0; j < term.terms.length; j++) {
          this.terms.push(terms[i].multiply(term.terms[j]));
        }
      }
    }
    return this;
  },

  copy : function() {
    var c = new TermBracket({pwr : this.pwr, terms : []});
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
    var terms = this.terms,
        pwrRef = {};
    this.terms = [];
    for(var i = 0; i < terms.length; i++) {
      var t = terms[i].segregate(term, pwr);
      if(t[0]) {
        if(!pwrRef[t[0].pwr]) {
          pwrRef[t[0].pwr] = new TermMultiply({terms : [t[0]]});
          pwrRef[t[0].pwr].addTerm(new TermBracket({terms : []}));
        }
        t[1] = t[1].condense();
        if(t[1]) {
          pwrRef[t[0].pwr].terms[0].addTerm(t[1]);
        }
      }
      else {
        t[1] = t[1].condense();
        if(t[1]) {
          this.addTerm(t[1]);
        }
      }
    }
    for(var p in pwrRef) {
      //if(pwrRef[p].terms[0].terms.length === 1) pwrRef[p] = pwrRef[p].simplify();
      pwrRef[p].terms[0] = pwrRef[p].terms[0].condense();
      this.addTerm(pwrRef[p]);
    }
    return [null, this];
  },

  hasSTerm : function(sterm) {
    if(!sterm) return 1;
    for(var i = 0; i < this.terms.length; i++) {
      if(this.terms[i].hasSTerm(sterm) === 1) return 1;
    }
    return 0;
  },

  convertToString : function () {
    var str = (this.coeff && this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")": this.coeff):"") +  "(";
    for(var i = 0; i < this.terms.length; i++) {
      var s = this.terms[i].convertToString();
      str += ""+s;
      if(i < this.terms.length - 1) str += "+";
    }
    str += ")";
    if(this.pwr && this.pwr !== 1) str += "^"+this.pwr;
    return str;
  },

  processForFactorization : function(termHeap, termRef, termsMeta, seperate) {
  },

  factorize : function(sterm) {
    var f = 1;
    while(f === 1) {
      var termHeap = [], termRef = {0 : {}, 1 : {btref : {}, tref : {}}},
          termsMeta = {termsLeft : this.terms.length};
      for(var i = 0; i < this.terms.length; i++) {
        this.terms[i] = this.terms[i].factorize(sterm);
        if(!this.terms[i].hasSTerm(sterm)) {
          this.terms[i].processForFactorization(termHeap, termRef, termsMeta, 1);
        }
        termsMeta.termsLeft--;
      }
      f = 0;
      if(termHeap.length > 0 && termHeap[0][0] > 0) {
        if(termHeap[0][1] === 0) {
          this.segregate(new Term({var : termHeap[0][2]}), termHeap[0][3]);
          this.sortAndStringify();
          if(this.terms.length === 1) {
            var t = this.terms.pop();
            t.coeff *= this.coeff;
            t.pwr *= this.pwr;
            return t.factorize(sterm);
          }
          f = 1;
        }
        else if(termHeap[0][1] === 1) {
          var p = termRef[1].btref[termHeap[0][2]];
          for(var k in p.tref) {
            if(p.tref.hasOwnProperty(k)) {
              var terms = termRef[1].tref[k].terms.filter(function(t) {
                return t.pwr !== 0;
              }), term;
              if(terms.length === 1) {
                term = terms[0].copy();
              }
              else {
                term = new TermMultiply({terms : terms});
              }
              term.coeff = -p.tref[k][2];
              term.sortAndStringify();
              this.addTerm(term);
            }
          }
          this.addTerm(new TermBracket({terms : p.terms, pwr : p.pwr}));
          f = 1;
        }
      }
      this.condense();
      this.sortAndStringify();
    }
    return this;
  },

  getVars : function(varRef) {
    for(var i = 0; i < this.terms.length; i++) {
      this.terms[i].getVars(varRef);
    }
  },

  getCode : function () {
    var str = (this.coeff && this.coeff !== 1 ? this.coeff+"*":"") +  "(";
    for(var i = 0; i < this.terms.length; i++) {
      var s = this.terms[i].getCode();
      str += ""+s;
      if(this.terms.length > 1 && i < this.terms.length - 1) str += "+";
    }
    str += ")";
    if(this.pwr && this.pwr !== 1) str = "Math.pow(" + str +", " + this.pwr + ")";
    return str;
  },

  sortAndStringify : function() {
    this.fullStr = (this.coeff && this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")": this.coeff):"");
    this.sortStr = "(";
    for(var i = 0; i < this.terms.length; i++) {
      this.terms[i].sortAndStringify();
    }
    this.terms.sort(TermBracket.sort_fun);
    for(var i = 0; i < this.terms.length; i++) {
      this.sortStr += this.terms[i].fullStr;
      if(i < this.terms.length - 1) this.sortStr += "+";
    }
    this.sortStr += ")";
    if(this.pwr && this.pwr !== 1) this.sortStr += "^"+this.pwr;
    this.fullStr += this.sortStr;
  },
  
});
