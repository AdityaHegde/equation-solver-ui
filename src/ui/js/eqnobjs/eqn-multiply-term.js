EQN.TermMultiply = EQN.TermBracket.extend({
  init : function() {
    this._super();
    var terms = this.get("terms");
    //pull the coeffs of each term to 'this' term
    terms.forEach(function(item) {
      this.set("coeff", this.get("coeff") * item.get("coeff"));
      item.set("coeff", 1);
    }, this);
  },

  type : 1,

  vari : function() {
    var terms = this.get("terms"), pwr = this.get("pwr");
    terms = Ember.A(terms.sort(EQN.TermBracket.sort_fun));
    var termsStr = terms.mapBy("fullStr").join("*");
    return termsStr;
  }.property('terms.@each.sortStr', 'terms.@each.fullStr', 'pwr'),

  filterAddedObjs : function(addedObjs) {
    addedObjs.forEach(function(item) {
      var terms = this.get("terms"), term = terms.findBy("vari", item.get("vari"));
      if(term) {
        //if a term of the same type as the added term already exists,
        //add its power to added term and delete it
        terms.removeObject(term);
        item.set("coeff", item.get("coeff") * term.get("coeff"));
        item.set("pwr", item.get("pwr") + term.get("pwr"));
      }
      //pull the coeff of added term to 'this' term
      this.set("coeff", this.get("coeff") * item.get("coeff"));
      item.set("coeff", 1);
      if(item.get("type") === 1) {
        //if the added term is a EQN.TermMultiply, add the terms to 'this' term
        item.get("terms").forEach(function(t) {
          //multiply each term's power to parent term's power and add it to 'this' term
          t.set("pwr", t.get("pwr") * this.item.get("pwr"));
          this.that.addTerm(t);
        }, {that : this, item : item});
        //set the power to 0 so that this is removed
        item.set("pwr", 0);
      }
    }, this);
  },

  addTerm : function(term) {
    this.get("terms").pushObject(term);
  },

  parse : function(tokens) {
    var t = tokens.next(), ct;
    if(this.get("terms").length === 0) {
      //if no terms were parsed, calculate coeff, pwr based on operator
      if(t === "-") this.set("coeff", -1);
      else if(t === "/") this.set("pwr", -1);
      t = tokens.next();
      //update coeff if next token is a number, else put the token back
      if(EQN.NUMBER_REGEX.test(t)) this.set("coeff", this.get("coeff") * Number(t));
      else tokens.back();
    }
    else {
      //else put the token back
      tokens.back();
    }
    while(!tokens.isEmpty()) {
      //create a EQN.Term, parse of EQN.Term will redirect to other terms
      ct = EQN.Term.create({}).parse(tokens);
      this.addTerm(ct);
      t = tokens.next();
      if(t === "+" || t === "-" || t === ")") {
        //if next token is '+' or '-' close the EQN.TermMultiply
        // ')' ??
        tokens.back();
        return this;
      }
      else if(t) {
        //else put the token back
        tokens.back();
      }
    }
    return this;
  },

  simplify : function(sterm) {
    var terms = this.get("terms");
    for(var i = 0; i < terms.get("length");) {
      var term = terms[i].simplify(sterm);
      terms.removeAt(i);
      if(term) {
        if(term.get("type") > 0 || !Ember.isEmpty(term.get("vari"))) {
          //if simplified term is not a just number
          //type check for EQN.TermMultiply or EQN.TermBracket
          //vari check for EQN.Term with a variable
          //TODO : handle dumplicates removed in beforeAddObserver
          terms.insertAt(i++, term);
        }
        else if(term.get("coeff") !== 1) {
          //if the term is a number but not 1
          //TODO : handle real numbers
          this.set("coeff", this.get("coeff") * term.get("coeff"));
        }
      }
      //increment i only if the simplified term was added,
      //else next term will still be at ith position
    }
    if(terms.get("length") === 0) {
      //if no terms were retained after simplification, return a EQN.Term with just the coeff
      return EQN.Term.create({coeff : this.coeff});
    }

    /*  expand brackets inside the EQN.TermMultiply  */

    //bt - 1st EQN.TermBracket
    //mts - EQN.TermBrackets not in bt
    //smt - a EQN.TermMultiply with terms in 'this' which is not EQN.TermBrackets, or doesnt have sterm
    var mts = [], smt = EQN.TermMultiply.create({terms : []}), bt = null;

    for(var i = 0; i < terms.get("length"); i++) {
      if(terms[i].get("type") === 0 || terms[i].get("pwr") !== 1 || !terms[i].hasSTerm(sterm)) {
        //add to smt if terms[i] is EQN.Term, power is not 1 or doesnt have sterm
        smt.addTerm(terms[i]);
      }
      else {
        //else is a term with multiple child terms
        if(!bt) {
          //if 1st multi term, assign it to 'bt'
          bt = terms[i];
        }
        else {
          //else push to mts
          mts.push(terms[i]);
        }
      }
    }

    if(smt.get("terms").get("length") !== 0) {
      //if there are single terms
      if(!bt) {
        //if there are no multi term, return 'this' as it needs no further simplification
        return this;
      }
      //else multiply the smt to bt
      bt.multiply(smt, sterm);
    }

    for(var i = 0; i < mts.length; i++) {
      //multiply bt to all remaining 'multi term' terms
      bt.multiply(mts[i], sterm);
    }

    //move the coeff from 'this' to 'bt'
    bt.set("coeff", this.get("coeff"));

    //simplify all terms after expanding brackets
    bt = bt.simplify(sterm);

    return bt
  },

  power : function(pwr, sterm) {
    if(pwr !== 0) {
      //raise each to pwr and set pwr of 'this' to 1
      this.set("coeff", Math.pow(this.get("coeff"), pwr));
      var terms = this.get("terms");
      for(var i = 0; i < terms.length; i++) {
        terms[i].power(pwr, sterm);
      }
      this.set("pwr", 1);
      return this;
    }
    return null;
  },

  multiply : function(term, sterm) {
    var ttype = term.get("type");
    if(ttype === 2) {
      //if term is a EQN.TermBracket then multiply 'this' to 'term'
      return term.multiply(this, sterm);
    }
    var ts = (ttype === 1 ? term.get("terms") : Ember.A([term]));
    //add the terms in EQN.TermMultiply or the single EQN.Term to 'this' term
    for(var i = 0; i < ts.length; i++) {
      this.addTerm(ts[i]);
    }
    if(ttype === 1) {
      //if term is a EQN.TermMultiply, multiply its coeff to coeff of 'this'
      //in case of EQN.Term, coeff is multiplied in addTerm call
      this.set("coeff", this.get("coeff") * term.get("coeff"));
    }
    return this;
  },
  
  copy : function() {
    var terms = [], thisterms = this.get("terms");
    for(var i = 0; i < thisterms.length; i++) {
      terms.push(thisterms[i].copy());
    }
    return EQN.TermMultiply.create({
      coeff : this.get("coeff"),
      pwr : this.get("pwr"),
      terms : terms,
    });
  },

});
