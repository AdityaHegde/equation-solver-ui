EQN.TermBracket = EQN.Term.extend(Utils.ObjectWithArrayMixin, {
  init : function() {
    this.set("vars", []);
    this._super();
  },

  type : 2,

  arrayProps : ['terms'],

  terms : null,
  vari : function() {
    var terms = this.get("terms"), pwr = this.get("pwr"), forEachObj = {str : "", first : 1};
    terms = Ember.A(terms.sort(EQN.TermBracket.sort_fun));
    forEachObj.terms = terms;
    terms.forEach(function(term) {
      if(this.first === 1) {
        this.first = 0;
      }
      else if(term.get("coeff") >= 0) {
        this.str += "+";
      }
      this.str += term.get("fullStr");
    }, forEachObj);
    return "("+forEachObj.str+")";
  }.property('terms.@each.sortStr', 'terms.@each.fullStr'),

  vars : null,

  termsWillBeDeleted : function(deletedTerms) {
    var vars = this.get("vars")
    for(var i = 0; i < deletedTerms.length; i++) {
      var term = deletedTerms[i], termVars = term.get("vars");
      for(var j = 0; j < termVars.length; j++) {
        var varInstance = vars.find(function(ele) {
          return ele[0] === termVars[j][0];
        });
        if(varInstance) {
          varInstance[1] -= termVars[j][1];
          if(varInstance[1] === 0) vars.removeObject(varInstance);
        }
      }
    }
  },

  termsCanAdd : function(term) {
    var terms = this.get("terms"), searchContext = {found : null, term : term, that : this};
    //search for duplicates in the terms
    terms.forEach(function(term) {
      if(this.that.checkForDuplicate(this.term, term)) {
        this.found = term;
      }
    }, searchContext);
    if(searchContext.found) {
      //call handleDuplicate (which will be diff for diff term type)
      this.handleDuplicate(searchContext.found, term);
      return false;
    }
    else if(!this.canAddHook(term)) {
      return false;
    }
    return true;
  },

  termsWasAdded : function(addedTerms) {
    var terms = this.get("terms");
    //remove all terms with 0 coeff and 0 pwr
    var zeroCoeffTerms = terms.findBy('coeff', 0), zeroPowerTerms = terms.findBy('pwr', 0);
    if(zeroCoeffTerms) {
      terms.removeObject(zeroCoeffTerms);
    }
    if(zeroPowerTerms) {
      terms.removeObject(zeroPowerTerms);
    }
    var vars = this.get("vars")
    for(var i = 0; i < addedTerms.length; i++) {
      var term = addedTerms[i], termVars = term.get("vars");
      for(var j = 0; j < termVars.length; j++) {
        var varInstance = vars.find(function(ele) {
          return ele[0] === termVars[j][0];
        });
        if(varInstance) {
          varInstance[1] += termVars[j][1];
        }
        else {
          vars.pushObject([termVars[j][0], termVars[j][1]]);
        }
      }
    }
  },

  checkForDuplicate : function(cterm, term) {
    return term.get("sortStr") === cterm.get("sortStr") && term !== cterm;
  },

  handleDuplicate : function(term, duplicate) {
    //add the coeff if found
    term.set("coeff", term.get("coeff") + duplicate.get("coeff"));
  },

  canAddHook : function(term) {
    return true;
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

  //segregate a term to have single instance of a power
  //e.g. a^2+b*a^2 => a^2*(1+b)
  segregate : function(term, pwr) {
    //clear the terms and copy to empty array
    var terms = [], newTerms = this.get("terms"), len = newTerms.get("length"),
        pwrRef = {};
    for(var i = 0; i < len; i++) {
      terms.pushObject(newTerms.popObject());
    }
    for(var i = 0; i < terms.length; i++) {
      var t = terms[i].segregate(term, pwr);
      //segragate returns the seperated term in the 1th index and remaining term in the 0st index
      //e.g. a^2*b*c*d, term = a, pwr = 1  =>  [a*b*c*d, a]
      //if 'term' with 'pwr' doesnt exists it reutrns term in 0th index and null in 1st index
      //e.g. b*c*d, term = a, pwr = 1  =>  [b*c*d, null]
      if(t[1]) {
        var retPwr = t[1].get("pwr");
        //create a EQN.TermMultiply for each power of 'term'
        //with an EQN.Term of the 'term' raised to 'pwr' and an EQN.TermBracket with remaining terms
        //any subsequent terms with this pwr will be added to the EQN.TermBracket
        //store the EQN.TermMultiply and EQN.TermBracket in a hash map with pwr as key
        if(!pwrRef[retPwr]) {
          var brkTerm = EQN.TermBracket.create({terms : []}),
              mulTerm = EQN.TermMultiply.create({terms : [t[1], brkTerm]});
          pwrRef[retPwr] = [brkTerm, mulTerm];
          this.addTerm(mulTerm);
        }
        pwrRef[retPwr][0].addTerm(t[0]);
      }
      else {
        this.addTerm(t[0]);
      }
    }
    //if there is only 1 term, discard the current EQN.TermBracket and return the only term
    //e.g. EQN.TermBracket((a^2+2*b*a^2))  =>  EQN.TermBracket((a^2*(1+b)))  =>  EQN.TermMultiply(a^2*(1+b))
    if(newTerms.length === 1) {
      return [newTerms[0], null];
    }
    for(var k in pwrRef) {
      //calculate hcf of coeff of each EQN.TermBracket and seperate it and multiply to the outer EQN.TermMultiply
      //e.g. 2*a^2+2*b*a^2+a => a^2*(2+2*b)+a => 2*a^2*(1+b)+a
      if(pwrRef.hasOwnProperty(k)) {
        var pwrTerms = pwrRef[k][0].get("terms"),
            hcf = pwrTerms[0].get("coeff");
        for(var i = 1; i < pwrTerms.length; i++) {
          hcf = Math.hcf(hcf, pwrTerms[i].get("coeff"));
          if(hcf === 1) break;
        }
        if(hcf > 1) {
          for(var i = 0; i < pwrTerms.length; i++) {
            pwrTerms[i].set("coeff", pwrTerms[i].get("coeff") / hcf);
          }
          pwrRef[k][1].set("coeff", pwrRef[k][1].get("coeff") * hcf);
        }
      }
    }
    return [this, null];
  },

  factorize : function(sterm) {
    var f = 1;
    //execute till there are no terms left to factorize
    while(f === 1) {
      var termHeap = [], termRef = {},
          terms;
      //call factorize on each term first
      forEachDynamicContent(this.get("terms"), function(ele) {
        return ele.factorize(this);
      }, sterm, this);
      terms = this.get("terms");
      //every term that doesnt have 'sterm' is added to a heap with most number of occurances at the top
      //for a EQN.TermMultiply each term within it is added
      for(var i = 0; i < terms.length; i++) {
        if(!terms[i].hasSTerm(sterm)) {
          terms[i].addTermToHeap(termHeap, termRef);
        }
      }
      f = 0;
      if(termHeap.length > 0 && termHeap[0][0] > 1) {
        //if there are any terms that have more than 1 occurance
        //call segregate on it
        this.segregate(EQN.Term.create({vari : termHeap[0][1]}), termHeap[0][2]);
        if(this.get("terms.length") === 1) {
          //if only 1 term is left, discard this EQN.TermBracket and return it
          var t = this.get("terms").popObject();
          t.coeff *= this.coeff;
          t.pwr *= this.pwr;
          return t.factorize(sterm);
        }
        f = 1;
      }
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
    if(a[2] === b[2]) {
      return EQN.TermBracket.strcmp1(a[1], b[1]);
    }
    else {
      return a[2] - b[2];
    }
  }
  return a[0] - b[0];
};
EQN.TermBracket.sort_fun = function(a, b) {return EQN.TermBracket.strcmp(a.get("sortStr"), b.get("sortStr"))};
