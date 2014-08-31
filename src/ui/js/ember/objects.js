EQNAPP.Profile = ModelWrapper.createModelWrapper({
  user_id : attr(),
  user_name : attr(),
  problems : hasMany("problem", {async : true}),
}, {
  keys : ["user_id"],
  apiName : "profile",
  queryParams : ["user_id"],
});

EQNAPP.Problem = ModelWrapper.createModelWrapper({
  name : attr(),
  eqns : hasMany("eqn", {async : true}),

  mainEqn : function() {
    var eqns = this.get("eqns");
    return eqns.findBy("isMain", true);
  }.property("eqns.@each.isMain", "eqns.@each.fullStr"),

  buildEqns : function() {
    var eqns = this.get("eqns");
    eqns.forEach(function(eqn) {
      eqn.buildEqn();
    });
  },

  simplify : function(factorize) {
    var eqns = this.get("eqns"), mainEqn = eqns.findBy("isMain", true);
    eqns.forEach(function(eqn) {
      eqn.simplify(mainEqn.get("lhsTerm"));
    });
    eqns.forEach(function(eqn) {
      if(!eqn.get("isMain")) {
        this.replace(eqn.get("lhsTerm"), eqn.get("term"));
        this.simplify();
      }
    }, mainEqn);
    mainEqn.segregate(mainEqn.get("lhsTerm"));
    if(factorize) mainEqn.factorize(mainEqn.get("lhsTerm"));
  },
}, {
  keys : ["id"],
  apiName : "problem",
  queryParams : ["id"],
  retainId : true,
});

EQNAPP.Eqn = ModelWrapper.createModelWrapper({
  eqnId : attr(),
  eqnStr : attr(),
  lhsTermStr : attr(),
  isMain : attr('boolean', {defaultValue : false}),
  parsedEqn : "",
  term : null,
  lhsTerm : null,
  fullStr : function() {
    var term = this.get("term");
    if(term) {
      return term.fullStr;
    }
    else {
      return "";
    }
  }.property("term"),

  problem : belongsTo("problem", {async : true}),

  prepareTermString : function(str) {
    str = str.replace(/\s+/g, " ");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2 $3");
    str = str.replace(/(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)/g, "$1 $2");
    return str;
  },

  buildEqn : function() {
    var eqnStr = this.get("eqnStr"), lhsTermStr = this.get("lhsTermStr"),
        term, lhsTerm;
    term = new TermBracket({terms : []}).parse(new Tokens(this.prepareTermString(eqnStr).split(" ")));
    lhsTerm = new Term({terms : []}).parse(new Tokens(this.prepareTermString(lhsTermStr).split(" ")));
    this.set("term", term);
    this.set("lhsTerm", lhsTerm);
  },

  simplify : function(sterm) {
    var term = this.get("term");
    term = term.simplify(sterm);
    term.sortAndStringify();
    this.set("term", term);
  },

  replace : function(rterm, wterm) {
    var term = this.get("term");
    term = term.replace(rterm, wterm);
    term.sortAndStringify();
    this.set("term", term);
  },

  segregate : function(sterm, pwr) {
    var segTerm = this.get("term").segregate(sterm, pwr), newTerm;
    if(segTerm[0]) {
      newTerm = new TermMultiply({terms : segTerm});
    }
    else {
      newTerm = segTerm[1];
    }
    newTerm.sortAndStringify();
    this.set("term", newTerm);
  },

  factorize : function(sterm) {
    this.set("term", this.get("term").factorize(sterm));
    /*
    EqnWorker.invokeWorker(this.get("term"), "factorize", [sterm], function(term) {
      this.set("term", term);
    }, this);
    */
  },

  copy : function() {
    return EQNAPP.Eqn.create({
      eqnStr : this.get("eqnStr"),
      parsedEqn : this.get("parsedEqn"),
      term : this.get("term").copy(),
    });
  },
}, {
  keys : ["problem", "eqnId"],
  apiName : "eqn",
  queryParams : ["eqnId"],
  retainId : true,
});

CrudAdapter.ModelMap = {};
