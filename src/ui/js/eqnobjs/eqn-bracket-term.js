EQN.TermBracket = EQN.Term.extend({
  type : 2,

  init : function() {
    this._super();
    Ember.addBeforeObserver(this, "terms", this, "termsWillChange");
    this.set("terms", this.get("terms") || []);
    var terms = this.get("terms");
    terms.addArrayObserver(this, {
      willChange : this.termsArrayWillChange,
      didChange : this.termsArrayDidChange,
    });
  },

  termsWillChange : function() {
    var terms = this.get("terms");
    if(terms) {
      terms.removeArrayObserver(this);
    }
  },

  termsDidChange : function() {
    var terms = this.get("terms");
    terms.addArrayObserver(this, {
      willChange : this.termsArrayWillChange,
      didChange : this.termsArrayDidChange,
    });
  }.property('terms'),

  terms : null,
  vari : function() {
    var terms = this.get("terms"), pwr = this.get("pwr");
    terms = Ember.A(terms.sort(EQN.TermBracket.sort_fun));
    var termsStr = terms.mapBy("fullStr").join("+");
    return "("+termsStr+")";
  }.property('terms.@each.sortStr', 'terms.@each.fullStr'),

  termsArrayWillChange : function(terms, idx, removedCount, addedCount) {
  },

  termsArrayDidChange : function(terms, idx, removedCount, addedCount) {
    var addedObjs = Ember.A(terms.splice(idx, idx + addedCount));
    this.filterAddedObjs(addedObjs);
    for(var i = 0; i < addedObjs.length; i++) {
      terms.splice(i + idx, 0, addedObjs[i]);
    }
    var zeroCoeffTerms = terms.findBy('coeff', 0), zeroPowerTerms = terms.findBy('pwr', 0);
    if(zeroCoeffTerms) {
      terms.removeObject(zeroCoeffTerms);
    }
    if(zeroPowerTerms) {
      terms.removeObject(zeroPowerTerms);
    }
  },

  filterAddedObjs : function(addedObjs) {
    addedObjs.forEach(function(item) {
      //search for duplicates with same addable type
      var terms = this.get("terms"), term = terms.findBy("sortStr", item.get("sortStr"));
      if(term) {
        terms.removeObject(term);
        //add the coeff if found
        item.set("coeff", item.get("coeff") + term.get("coeff"));
      }
    }, this);
  },

  addTerm : function(term) {
    if(term.get("type") === 2 && term.get("pwr") === 1) {
      //if the added term is a EQN.TermBracket, push the terms to 'this'
      var termterms = term.get("terms");
      for(var i = 0; i < termterms.length; i++) {
        termterms[i].set("coeff", termterms[i].get("coeff") * term.get("coeff"));
        this.get("terms").pushObject(termterms[i]);
      }
    }
    else {
      //else just push it to terms
      this.get("terms").pushObject(term);
    }
  },

  parse : function(tokens) {
    var t = tokens.next(), ct;
    if(EQN.operators[t]) {
      //if the token is operator, and operator is -, negate coeff
      if(t === "-") this.set("coeff", -1);
      //if the operator is /, negate the power
      else if(t === "/") this.set("pwr", -1);
      t = tokens.next();
    }
    else {
      //else put the token back in the pool to be scanned later
      tokens.back(); 
    }
    while(!tokens.isEmpty()) {
      t = tokens.next();
      if(t === "(") {
        //tokens.back();
        //if the token is an opening bracket, start parsing of EQN.TermBracket
        ct = EQN.TermBracket.create({terms : []}).parse(tokens);
      }
      else {
        //else put the token back and start parsing of EQN.Term
        tokens.back();
        ct = EQN.Term.create({}).parse(tokens);
      }
      t = tokens.next();
      if(t === "*" || t === "/") {
        //if the next token is * or / then start parsing of EQN.TermMultiply
        tokens.back();
        this.addTerm(EQN.TermMultiply.create({terms : [ct]}).parse(tokens));
      }
      else {
        //else add the term to this EQN.TermBracket
        tokens.back();
        this.addTerm(ct);
      }
      t = tokens.next();
      //if next term is a closing bracket, current EQN.TermBracket has closed
      if(t === ")") break;
      //break if tokens are exhausted
      if(!t) return this;
      tokens.back();
    }
    t = tokens.next();
    if(t === "^") {
      //parse the power if the next token is ^
      this.set("pwr", Number(tokens.next()));
    }
    else if(t) {
      tokens.back();
    }
    return this;
  },

  simplify : function(sterm) {
    var terms = this.get("terms"), term;
    forEachDynamicContent(terms, function(term) {
      return term.simplify(this);
    }, sterm, this);
    terms = this.get("terms");
    if(terms.length === 1) {
      //return the single term instead of having a EQN.TermBracket with single term
      if(!term) term = terms[0];
      term.set("coeff", term.get("coeff") * this.get("coeff"));
      term.set("pwr", term.get("pwr") * this.get("pwr"));
    }
    else {
      term = this;
    }

    if(term && term.get("type") > 0 && term.get("pwr") !== 1) {
      //if 'term' is a EQN.TermBracket or EQN.TermMultiply then raise it to power
      term = term.power(term.get("pwr"), sterm, 1);
    }

    return term;
  },

  power : function(pwr, sterm, dontRaisePwr) {
    //seperate terms into 2 sets of terms, st - single 1st term, mt - remaining terms as a EQN.TermBracket
    //br - 1 if mt has multiple terms
    var ncr = 1, ts = this.get("terms"),
        st, mt, terms = [], newTerms = [],
        br = 0, stf = 0;

    if(pwr === 0) return null;

    //put all the terms which has 'sterm' in the begining, rest at the end
    //only the terms with 'sterm' will be expanded
    for(var i = 0; i < ts.length; i++) {
      if(ts[i].hasSTerm(sterm)) {
        terms.unshift(ts[i]);
        stf = 1;
      }
      else terms.push(ts[i]);
    }

    //if there are no terms with 'sterm', and dontRaisePwr is null, return 'this' unaltered
    if(stf === 0) {
      if(!dontRaisePwr) this.pwr *= pwr;
      return this;
    }
    st = terms.shift();

    //this.terms = [];
    if(terms.length !== 1) {
      //form a EQN.TermBracket if there are multiple terms in the 2nd set
      mt = EQN.TermBracket.create({terms : terms});
      br = 1;
    }
    else {
      //else assign the 2nd term to mt
      mt = terms.shift();
    }

    this.set("terms", Ember.A([]));
    //apply 'Binomial theorem', Tn = nCr * a^r * b^(n-r)
    for(var i = 0; i <= pwr; i++) {
      var sti = st.copy(), mti = mt.copy();
      sti = sti.power(pwr - i, sterm);
      mti = mti.power(i, sterm);
      var ct = sti || mti;
      if(sti && mti) ct = ct.multiply(mti);
      ct.coeff *= ncr;
      this.addTerm(ct);
      ncr *= (pwr - i)/(i + 1);
    }
    this.pwr = 1;
    return this;
  },

  multiply : function(term, sterm) {
    var terms = this.get("terms");
    if(term.get("type") < 2) {
      //if the term is a simple term or a EQN.TermMultiply, multiply 'term' to every term in the EQN.TermBracket
      forEachDynamicContent(terms, function(term) {
        return term.multiply(this.term.copy(), this.sterm);
      }, {sterm : sterm, term : term}, this);
    }
    else {
      //else multiply every term of 'term' (a EQN.TermBracket) with every term in 'this' EQN.TermBracket
      this.set("terms", Ember.A([]));
      var tterms = term.get("terms");
      for(var i = 0; i < terms.length; i++) {
        for(var j = 0; j < tterms.length; j++) {
          var thist = terms[i].copy(), thatt = tterms[j].copy();
          this.addTerm(thist.multiply(thatt));
        }
      }
    }
    return this;
  },

  hasSTerm : function(sterm) {
    //return true if sterm is null
    //if there is no sterm, expand all brackets
    if(!sterm || Ember.typeOf(sterm) !== "instance") return true;
    //check with 'this' 'vari'
    if(this.get("vari") === sterm.get("vari")) return true;
    //check inside all children terms
    var terms = this.get("terms");
    for(var i = 0; i < terms.length; i++) {
      if(terms[i].hasSTerm(sterm)) return true;
    }
    return false;
  },

  replace : function(rterm, wterm) {
    //replace 'rterm' with 'wterm'
    if(this.get("vari") === rterm.get("vari")) {
      var wtterm = wterm.copy();
      wtterm.set("coeff", wtterm.get("coeff") * this.get("coeff"));
      wtterm.set("pwr", wtterm.get("pwr") * this.get("pwr"));
      return wtterm;
    }
    else {
      //call replace on all child terms
      var terms = this.get("terms");
      forEachDynamicContent(terms, function(term) {
        return term.replace(this.rterm, this.wterm);
      }, {rterm : rterm, wterm : wterm}, this);
    }
    return this;
  },

  copy : function() {
    var terms = [], thisterms = this.get("terms");
    for(var i = 0; i < thisterms.length; i++) {
      //copy all the children terms
      terms.push(thisterms[i].copy());
    }
    //create a new EQN.TermBracket with same coeff, pwr and copied terms
    return EQN.TermBracket.create({
      coeff : this.get("coeff"),
      pwr : this.get("pwr"),
      terms : terms,
    });
  },

});
EQN.TermBracket.strcmp = function(a, b) {return a.length === b.length ? (a > b ? 1 : -1) : (a.length > b.length ? 1 : -1)};
EQN.TermBracket.strcmp1 = function(a, b) {return a.length === b.length ? (a == b ? 0 : (a > b ? 1 : -1)) : (a.length > b.length ? 1 : -1)};
EQN.TermBracket.comparator = function(a, b) {
  if(a[0] === b[0]) {
    var strcmp = EQN.TermBracket.strcmp1(a[1], b[1]);
    if(strcmp === 0) a[2] - b[2];
    return -strcmp;
  }
  return a[0] - b[0];
};
EQN.TermBracket.sort_fun = function(a, b) {return EQN.TermBracket.strcmp(a.get("sortStr"), b.get("sortStr"))};
