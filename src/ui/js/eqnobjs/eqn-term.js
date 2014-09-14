function Term(config) {
  Term.parent.call(this, config);
  this.type = 0;
  //to add it to json object
  this.key = this.key;

  this.pwr = this.pwr || 1;
  this.coeff = this.coeff || 1;
  
  this.init();
}
Term.sortFun = function(a, b) {
  return b.vari < a.vari;
};
inherit(Base, Term, {

  key : "Term",

  init : function() {
    this.vari = this.vari || "";
    this.coeff = Number(this.coeff) || 1;
  },

  fromString : function(str) {
    str = str.replace(/\s+/g, " ");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2 $3");
    str = str.replace(/(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)/g, "$1 $2");
    var tokens = new Tokens(str.split(" "));
    return this.parse(tokens);
  },

  parse : function(tokens) {
    var t = tokens.next();
    this.vari = "";
    //if the term begins with an operator
    if(operators[t]) {
      this.op = t;
      if(this.op === "-") {
        //if operator is -, negate coeff and set operator to +
        this.coeff = -this.coeff;
        this.op = "+";
      }
      else if(this.op === "/") {
        //if operator is /, negate pwr and set operator to *
        this.coeff = 1/this.coeff;
        this.op = "*";
        if(this.pwr) this.pwr = -this.pwr;
      }
      t = tokens.next();
    }
    if(t === "(") {
      //if the next token is an open brace, put the operator and bracket back and parse TermBracket
      tokens.back(2);
      return new TermBracket({terms : []}).parse(tokens);
    }
    var isNum = 0;
    if(NUMBER_REGEX.exec(t)) {
      //if the next token is a number, assign it to coeff
      this.coeff *= Number(t);
      t = tokens.next();
      isNum = 1;
    }
    if(operators[t]) {
      if(t === "+" || t === "-" || t === ")") {
        //if next token is +/-/), put back the operator and start parsing next term
        tokens.back();
        return this;
      }
      else {
        /*if(isNum === 1) {
          tokens.back();
          return this;
        }*/
        if(t === "*" || t === "/") {
          //if operator is /, negate pwr
          if(t === "/") this.pwr = -this.pwr;
          t = tokens.next();
        }
        else if(t === "^") {
          //if operator is ^, compute pwr
          t = tokens.next();
          this.coeff = Math.pow(this.coeff, Number(t));
          return this;
        }
      }
    }
    //the next token is always a vairable
    this.vari = t;
    t = tokens.next();
    if(t === "^") {
      //if next token is ^, compute pwr
      t = tokens.next();
      if(t === "-") {
        //negate the pwr if token operate is -
        this.pwr = -this.pwr;
        t = tokens.next();
      }
      this.pwr *= Number(t);
      return this;
    }
    if(t) tokens.back();
    return this;
  },

  equalTo : function(term, typeOnly) {
    //if sortStr is calculated, compare them
    if(this.sortStr && term.sortStr) {
      if(this.sortStr === term.sortStr) return 1
    }
    else if(term.vari) {
      if(this.vari === term.vari && (typeOnly || this.pwr === term.pwr)) return 1
    }
    //else if(Ember.isEmpty(term.vari) && Ember.isEmpty(this.vari)) return 1;
    return 0;
  },

  add : function(term) {
    //if the terms are equal (var and pwr) then add them
    if(this.equalTo(term) === 1) {
      this.coeff = this.coeff + term.coeff;
      return 1;
    }
    return 0;
  },

  power : function(pwr) {
    if(pwr !== 0) {
      //multiply the pwr and raise coeff
      this.pwr = (this.pwr ? this.pwr * pwr : pwr);
      this.coeff = Math.pow(this.coeff, pwr);
      return this;
    }
    else {
      this.pwr = 0;
    }
    return null;
  },

  simplify : function(sterm) {
    return this;
  },

  condense : function() {
    this.sortAndStringify();
    return this;
  },

  multiply : function(term, sterm) {
    //if 'term' is a TermBracket or a TermMultiply multiply 'this' to 'term'
    if(term.type > 0) return term.multiply(this, sterm);
    //else create a TermMultiply with 'this' as a child term
    var t = new TermMultiply({terms : [this]});
    //and multiply 'term' to it
    return t.multiply(term, sterm);
  },

  copy : function() {
    return new Term({coeff : this.coeff, vari : this.vari, pwr : this.pwr, op : this.op});
  },

  replace : function(term, withTerm) {
    //the place where the replace actually happens
    //replace only if 'this' is the same variable as 'term'
    if(term.vari && term.vari === this.vari) {
      //create a copy of 'withTerm'
      var ret = withTerm.copy();
      //multiply pwr of 'this' to it
      ret.pwr *= this.pwr;
      if(ret.type === 2) {
        //if 'ret' is a TermBracket, multiply coeff to each term
        for(var i = 0; i < ret.terms.length; i++) {
          ret.terms[i].coeff *= this.coeff;
        }
      }
      else {
        //else multiply the coeff to 'ret' itself
        ret.coeff *= this.coeff;
      }
      return ret;
    }
    return this;
  },

  segregate : function(term, pwr) {
    var t = null;
    //execute only if it is 'this' is the same variable as 'term'
    //and has a greater pwr that the one passed, if passed
    if(this.vari === term.vari && (!pwr || this.pwr >= pwr)) {
      //create a copy of 'this'
      t = this.copy();
      t.coeff = 1;
      if(pwr && this.pwr > pwr) {
        //if a 'pwr' is passed, segragate only that portion of pwr
        this.pwr -= pwr;
        t.pwr = pwr;
      }
      else {
        //else segregate all of the var and retain a number
        this.vari = "";
        this.pwr = 1;
      }
    }
    return [t, this];
  },

  hasSTerm : function(sterm) {
    if(!sterm) return 1;
    if(this.vari && sterm.vari === this.vari) return 1;
    return 0;
  },

  convertToString : function () {
    if(this.vari) {
      return (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"") + this.vari + (this.pwr !== 1 ? "^"+this.pwr : "");
    }
    else {
      return (this.coeff < 0 ? "("+this.coeff+")":this.coeff);
    }
  },

  //for a^2bc, expand (a+b+c)^4
  //give a better function name
  _generateTermsForPower : function(terms, pwrs, pwr) {
    if(!pwr) {
      pwr = 0;
      for(var i = 0; i < pwrs.length; i++) {
        pwr += pwrs[i];
      }
    }
    var pwrDist = MathUtils.distributePwrsFor_N_R.distributePwrsFor_N_R(pwr, terms.length),
        //coeffs = MathUtils.coeffsForRaiseToPwr.getCoeffs(pwr, terms.length),
        retTermSets = [];
    for(var i = 0; i < pwrDist.length; i++) {
      var retTermSet = [];
      for(var j = 0; j < pwrDist[i].length; j++) {
        var t = terms[j].copy();
        t.power(pwrDist[i][j]);
        retTermSet.push(t);
      }
      retTermSets.push(retTermSet);
    }
    return retTermSets;
  },

  //for a^4b^2c :  (a^2)^2(b)^2c, (a^2)^2b^2c, a^4b^2c, etc
  _generatePossibleTermAndPowerPairs : function(terms) {
    terms = terms || this.terms || [];
    //terms and powers
    var tsnps = [];
    for(var i = 0; i < terms.length; i++) {
      //possible power pairs
      //powers for terms
      var ppp = Math.factors.getPairsOfFactors(terms[i].pwr), psft = [];
      for(var j = 0; j < ppp.length; j++) {
        psft.push([new Term({vari : terms[i].vari, pwr : ppp[j][0]}), ppp[j][1]]);
      }
      tsnps.push(psft);
    }
    return MathUtils.combinations.selectionProblem(tsnps);
  },

  processForFactorization : function(termHeap, termRef, termsMeta, seperate) {
    if(this.vari) {
      for(var i = 1; i <= this.pwr; i++) {
        var key = this.vari+"--"+i;
        if(termRef[0][key]) {
          termRef[0][key][0] += i;
          Math.heap.modified(termHeap, termRef[0][key], TermBracket.heapcmp);
        }
        else {
          //0th idx - no of operations decreased
          //1st idx - type, 0 - simple term occurance
          //2nd idx - vari
          //3rd idx - pwr
          termRef[0][key] = [-1, 0, this.vari, i];
          Math.heap.insert(termHeap, termRef[0][key], TermBracket.heapcmp);
        }
      }
      if(seperate) {
        if(termRef[1].tref[key]) {
          for(var j = 0; j < termRef[1].tref[key].bts.length; j++) {
            var p = termRef[1].tref[key].bts[j];
            p.tref[key][0] = 1;
            //only if the coeffs match, else this term will still remain
            p.tref[key][1] += this.coeff;
            if(this.coeff === p.tref[key][2]) p.href[0] += this.pwr;
            Math.heap.modified(termHeap, p.href, TermBracket.heapcmp);
          }
        }
        else {
          termRef[1].tref[key] = {bts : [], coeff : this.coeff, terms : [this.copy()]};
        }
      }
    }
  },

  factorize : function(sterm) {
    return this;
  },

  getVars : function(varRef) {
    if(this.vari) {
      var arr = /^(.*?)\[\d+\]$/.exec(this.vari);
      if(arr) varRef[arr[1]] = {Array : 1};
      varRef[this.vari] = varRef[this.vari] || {};
      varRef[this.vari][this.pwr || 1] = 1;
    }
  },

  getCode : function() {
    var str = "", cf = 0;
    if(this.vari) {
      var idx = indexMap[this.vari.charAt(0)];
      if(idx || idx === 0) {
        str += this.vari.substr(1) + "[" + idx + "]";
      }
      else {
        str += this.vari;
      }
      cf = 1;
    }
    if(this.pwr !== 1) {
      str = "Math.pow(" + str +", " + this.pwr + ")";
      cf = 1;
    }
    if(this.coeff && (cf === 0 || this.coeff !== 1)) {
      str = this.coeff + (cf === 1 ? "*":"") + str;
    }
    return str;
  },

  sortAndStringify : function() {
    if(this.vari) {
      this.sortStr = this.vari + (this.pwr !== 1 ? "^"+this.pwr : "");
      this.fullStr = (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"") + this.sortStr;
    }
    else {
      this.sortStr = 1;
      this.fullStr = (this.coeff < 0 ? "("+this.coeff+")":this.coeff);
    }
  },

});

