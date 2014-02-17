SortFilter = Ember.Namespace.create();
//TODO : support changing filter property type and dynamic filter values
SortFilter.FilterPropertyValue = Ember.Object.extend({
  label : "",
  val : "",
  checked : true,
});
SortFilter.FilterProperty = Ember.Object.extend({
  filterProperty : "",
  filterRegex : "",
  regexObject : function() {
    return new RegExp(this.get("filterRegex"), "i");
  }.property('filterRegex'),
  filteredByRegex : true,
  filterValues : [],
  filterValueOptions : Utils.hasMany(SortFilter.FilterPropertyValue),
  filterValueOptionsDidChange : function() {
    var filterValueOptions = this.get("filterValueOptions");
    this.set("filterValues", filterValueOptions.filterBy('checked', true).mapBy('val'));
  }.observes('filterValueOptions.@each.checked', 'filterValueOptions.@each.val'),
  filterJoiner : "or",

  filterValue : function(item) {
    var filteredByRegex = this.get("filteredByRegex"),
        regexObject = this.get("regexObject"),
        filterValues = this.get("filterValues"),
        filterJoiner = this.get("filterJoiner"),
        filterProperty = this.get("filterProperty");
    if(filterProperty) {
      var propValue = item.get(filterProperty);
      if(filteredByRegex) {
        return regexObject.test(propValue);
      }
      else {
        filterJoiner = filterJoiner == "and";
        var bool = filterJoiner;
        filterValues.forEach(function(filterValue) {
          var res = propValue == filterValue;
          bool = (filterJoiner && (bool && res)) || (!filterJoiner && (bool || res));
        });
        return bool;
      }
    }
    else {
      return true;
    }
  },
});

//TODO : revisit the observers addition and deletion
SortFilter.SortFilterController = Ember.ArrayController.extend({
  init : function() {
    this._super();
    var filterProperties = this.get("filterProperties") || [];
    //convert own properties (if any) to Ember.FilterProperty objects
    this.set("filterProperties", filterProperties);
    Ember.addBeforeObserver(this, "filterProperties.@each", this, "filterPropertiesWillChange");
  },

  filterProperties : Utils.hasMany(Ember.FilterProperty),
  isFiltered : function() {
    var filterProperties = this.get("filterProperties");
    return filterProperties && filterProperties.length > 0;
  }.property('filterProperties.@each'),

  filterContent : function(content) {
    var filterProperties = this.get('filterProperties');
    filterProperties.forEach(function(filterProperty) {
      content = content.filter(filterProperty.filterValue, filterProperty);
    }, this);
    return content;
  },

  removeAttachedObservers : function(sortOverride, filterOverride) {
    var content = this.get('content'),
        arrangedContent = this.get('arrangedContent'),
        sortProperties = sortOverride || this.get('sortProperties') || [],
        filterProperties = filterOverride || this.get('filterProperties') || [];

    if (content) {
      content.forEach(function(item) {
        if(arrangedContent.contains(item)) {
          sortProperties.forEach(function(sortProperty) {
            Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
          }, this);
        }
        filterProperties.forEach(function(filterProperty) {
          if(filterProperty.filterProperty) Ember.removeObserver(item, filterProperty.filterProperty, this, 'contentItemFilterPropertyDidChange');
        }, this);
      }, this);
    }
  },

  destroy: function() {
    this.removeAttachedObservers();
    return this._super();
  },

  //this is to facilitate changing of the filter property
  filterPropertiesWillChange : function() {
    var filterProperties = this.get('filterProperties') || [];
    filterProperties.forEach(function(item) {
      Ember.removeBeforeObserver(item, 'filterProperty', this, 'filterPropertyWillChange');
    }, this);
  },

  filterPropertiesDidChange : function() {
    this.removeAttachedObservers([]);
    var filterProperties = this.get('filterProperties') || [];
    filterProperties.forEach(function(item) {
      Ember.addBeforeObserver(item, 'filterProperty', this, 'filterPropertyWillChange');
    }, this);
  }.observes('filterProperties.@each'),

  filterPropertyWillChange : function() {
    this.removeAttachedObservers([]);
  },

  arrangedContent: Ember.computed('content', 'sortProperties.@each', 'filterProperties.@each.filterProperty', 'filterProperties.@each.filterRegex', 'filterProperties.@each.filterValues', function(key, value) {
    var content = this.get('content'), retcontent,
        isSorted = this.get('isSorted'),
        sortProperties = this.get('sortProperties'),
        isFiltered = this.get('isFiltered'),
        filterProperties = this.get('filterProperties'),
        self = this, hasContent = content && (content.length > 0 || (content.get && content.get("length") > 0));

    if(hasContent && (isSorted || isFiltered)) {
      retcontent = content.slice();
    }

    if(retcontent && isFiltered) {
      retcontent = this.filterContent(retcontent);
      content.forEach(function(item) {
        filterProperties.forEach(function(filterProperty) {
          if(filterProperty.filterProperty) Ember.addObserver(item, filterProperty.filterProperty, this, 'contentItemFilterPropertyDidChange');
        }, this);
      }, this);
    }

    if(retcontent && isSorted) {
      retcontent.sort(function(item1, item2) {
        return self.orderBy(item1, item2);
      });
      content.forEach(function(item) {
        if(retcontent.contains(item)) {
          sortProperties.forEach(function(sortProperty) {
            Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
          }, this);
        }
      }, this);
    }

    if(retcontent && (isSorted || isFiltered)) {
      return Ember.A(retcontent);
    }

    return Ember.A([]);
  }),

  _contentWillChange: Ember.beforeObserver('content', function() {
    this.removeAttachedObservers();
    this._super();
  }),

  contentArrayWillChange: function(array, idx, removedCount, addedCount) {
    var isSorted = this.get('isSorted'),
        isFiltered = this.get('isFiltered');
    if(isSorted || isFiltered) {
      var arrangedContent = this.get('arrangedContent'),
          removedObjects = array.slice(idx, idx+removedCount),
          sortProperties = this.get('sortProperties'),
          filterProperties = this.get('filterProperties');
      removedObjects.forEach(function(item) {
        if(arrangedContent.contains(item)) {
          arrangedContent.removeObject(item);
          if(isSorted) {
            sortProperties.forEach(function(sortProperty) {
              Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
            }, this);
          }
          if(isFiltered) {
            filterProperties.forEach(function(filterProperty) {
              if(filterProperty.filterProperty) Ember.removeObserver(item, filterProperty.filterProperty, this, 'contentItemFilterPropertyDidChange');
            }, this);
          }
        }
      });
    }
  },

  contentArrayDidChange : function(array, idx, removedCount, addedCount) {
    var isSorted = this.get('isSorted'),
        isFiltered = this.get('isFiltered'),
        sortProperties = this.get('sortProperties'),
        filterProperties = this.get('filterProperties');
    if(isSorted || isFiltered) {
      var arrangedContent = this.get('arrangedContent'),
          addedObjects = array.slice(idx, idx+addedCount);
      if(isFiltered) {
        addedObjects.forEach(function(item) {
          filterProperties.forEach(function(filterProperty) {
            if(filterProperty.filterProperty) Ember.addObserver(item, filterProperty.filterProperty, this, 'contentItemFilterPropertyDidChange');
          }, this);
        }, this);
        addedObjects = this.filterContent(addedObjects);
      }
      addedObjects.forEach(function(item) {
        if(isSorted) {
          this.insertItemSorted(item);
          sortProperties.forEach(function(sortProperty) {
            Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
          }, this);
        }
        else {
          arrangedContent.pushObject(item);
        }
      }, this);
    }
  },

  contentItemFilterPropertyDidChange : function(item) {
    var arrangedContent = this.get('arrangedContent'),
        isSorted = this.get('isSorted'),
        sortProperties = this.get('sortProperties'),
        filterProperties = this.get('filterProperties'),
        isFiltered = true;
    filterProperties.forEach(function(filterProperty) {
      isFiltered = isFiltered && filterProperty.filterValue(item);
    }, this);
    if(arrangedContent.contains(item)) {
      if(!isFiltered) {
        sortProperties.forEach(function(sortProperty) {
          Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
        arrangedContent.removeObject(item);
      }
    }
    else if(isFiltered) {
      sortProperties.forEach(function(sortProperty) {
        Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
      }, this);
      this.insertItemSorted(item);
    }
  },
});

SortFilter.SortFilterView = Ember.View.extend({
  init : function() {
    this._super();
    var controllerObj = this.get("controllerObj"), innerModel = this.get("innerModel");
    if(controllerObj) {
      var controller = Ember.generateController(this.get("container"), controllerObj, this);
      controller.set("content", innerModel);
      this.set("controller", controller);
    }
  },

  controllerObj : null,
  innerModel : null,
  typeOptions : [
    {label : "Search by string", value : true},
    {label : "Filter by values", value : false},
  ],
  layout : Ember.Handlebars.compile('' +
    '<div class="form-horizontal col-sm-12">' +
      '<div class="form-group col-sm-3">' +
        '{{#if controller.isSorted}}' +
          '<label class="control-label col-sm-2">Sort</label>' +
          '<div class="col-sm-8">' +
            '{{view Views.SelectiveSelect class="form-control input-sm" options=controller.columnData filterColumn="sortable" optionValuePath="content.name" optionLabelPath="content.label" ' +
                                                                       'value=view.sortPropery}}' +
          '</div>' +
          '<a href="javascript:;" class="btn btn-link" {{action "changeSortOrder" target="view"}}><span {{bind-attr class=":glyphicon controller.sortAscending:glyphicon-chevron-up:glyphicon-chevron-down"}}></span></a>' +
        '{{/if}}' +
      '</div>' +
      '<div class="form-group col-sm-5">' +
        '{{#if view.hasFilterProperty}}' +
          '<label class="control-label col-sm-2">Filter</label>' +
          '<div class="col-sm-4">' +
            '{{view Views.SelectiveSelect class="form-control input-sm" options=controller.columnData filterColumn="filterable" optionValuePath="content.name" optionLabelPath="content.label" '+
                                                                       'value=view.filterProperty.filterProperty}}' +
          '</div>' +
          '<div class="col-sm-6">' +
            '{{#each view.filterProperty.filterValueOptions}}' +
              '<span class="form-group col-sm-6">' +
                '<span class="checkbox"><label>{{view Ember.Checkbox checkedBinding="checked"}}{{label}}</label></span>' +
              '</span>' +
            '{{/each}}' +
          '</div>' +
        '{{/if}}' +
      '</div>' +
      '<div class="form-group col-sm-4">' +
        '{{#if view.hasSearchProperty}}' +
          '<div class="col-sm-5">' +
            '{{view Views.SelectiveSelect class="form-control input-sm" options=controller.columnData filterColumn="searchable" optionValuePath="content.name" optionLabelPath="content.label" '+
                                                                       'value=view.searchProperty.filterProperty}}' +
          '</div>' +
          '<div class="col-sm-7">' +
            '{{input type="text" placeholder="Search" class="form-control input-sm" value=view.searchProperty.filterRegex}}' +
          '</div>' +
        '{{/if}}' +
      '</div>' +
    '</div>' +
    '<div class="clearfix"></div>' +
    '<div>{{yield}}</div>'),

  sortPropery : function(key, value) {
    var controller = this.get("controller");
    if(arguments.length > 1) {
      if(value) controller.set("sortProperties", [value]);
      return value;
    }
    else {
      var sortProperties = controller.get("sortProperties");
      return sortProperties && sortProperties[0];
    }
  }.property(),

  hasSearchProperty : function() {
    var controller = this.get("controller"), filterProperties = controller.get("filterProperties");
    if(!Ember.isEmpty(filterProperties)) {
      for(var i = 0; i < filterProperties.length; i++) {
        if(filterProperties[i].filteredByRegex) {
          this.set("searchProperty", filterProperties[i]);
          return true;
        }
      }
    }
    return false;
  }.property('controller.filterProperties.@each'),
  searchProperty : null,

  hasFilterProperty : function() {
    var controller = this.get("controller"), filterProperties = controller.get("filterProperties");
    if(!Ember.isEmpty(filterProperties)) {
      for(var i = 0; i < filterProperties.length; i++) {
        if(!filterProperties[i].filteredByRegex) {
          this.set("filterProperty", filterProperties[i]);
          var column = controller.get("columnData").findBy('name', filterProperties[i].filterProperty);
          if(column) filterProperties[i].set("filterValueOptions", column.options || []);
          return true;
        }
      }
    }
    return false;
  }.property('controller.filterProperties.@each'),
  filterProperty : null,
  filterPropertyDidChange : function() {
    var controller = this.get("controller"), columnData = controller.get("columnData"),
        filterProperty = this.get("filterProperty"), column = columnData.findBy('filterProperty', filterProperty.filterProperty);
    filterProperty.set("filterValueOptions", column.options || []);
  }.property('view.filterProperty.filterProperty'),

  actions : {
    addFilter : function() {
      var controller = this.get("controller"), filterProps = controller.get("filterProperties"),
          newProp = SortFilter.FilterProperty.create();
      filterProps.pushObject(newProp);
    },

    changeSortOrder : function() {
      var controller = this.get("controller"), sortAscending = controller.get("sortAscending");
      controller.set("sortAscending", !sortAscending);
    },
  },
});
