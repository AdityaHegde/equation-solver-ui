SCRIPTS_PATH = build/scripts
MINIFY_SCRIPT = $(SCRIPTS_PATH)/minifyFile.pl
REPLACE_SCRIPT_TAGS = $(SCRIPTS_PATH)/replaceScriptTags.pl
GET_FILES = $(SCRIPTS_PATH)/getDeepFiles.pl
GET_FILES_FLAGS = files
GET_DIRS_FLAGS = dirs
GET_ORDER = $(SCRIPTS_PATH)/getOrder.pl

INDEX_PATH = src/ui/index.html
MINIFIED_APP_JS = ember-app.js

PY_PROD_PATH = prod/python
PY_PROD_UI_PATH = $(PY_PROD_PATH)/public
PY_PROD_UI_LIB_PATH = $(PY_PROD_UI_PATH)/lib

JS_SRC_PATH = src/ui/js/
JS_SRC_PACKAGES = utils ember eqnobjs
JS_SRC_FILES = $(foreach package, $(JS_SRC_PACKAGES), $(shell perl $(GET_ORDER) $(INDEX_PATH) '"js/($(package)/.*?)"'))
JS_SRC_FILES_NAMES = $(notdir $(JS_SRC_FILES))
JS_SRC_FILES_FULLPATH = $(addprefix $(JS_SRC_PATH), $(JS_SRC_FILES))
JS_SRC_LIB_PATH = $(addprefix $(JS_SRC_PATH), lib)
JS_SRC_LIB_FILES = $(wildcard $(JS_SRC_LIB_PATH)/*)
JS_OP_FILES = $(JS_SRC_FILES_NAMES:%.js=%.min.js)

CSS_SRC_PATH = src/ui/css
CSS_SRC_FILES = $(wildcard $(CSS_SRC_PATH)/*)
CSS_OP_FILES = $(notdir $(CSS_SRC_FILES:%.css=%.min.css))

MINIFY_COMMAND = java
MINIFY_COMMAND_FLAGS = -jar build/yuicompressor-2.4.8.jar

%.min.js :
	$(MINIFY_COMMAND) $(MINIFY_COMMAND_FLAGS) $(filter %$(@:%.min.js=%.js), $(JS_SRC_FILES_FULLPATH)) > $@

%.min.css : $(CSS_SRC_PATH)/%.css
	$(MINIFY_COMMAND) $(MINIFY_COMMAND_FLAGS) $^ > $@

#ls -tr to maintain the order
$(MINIFIED_APP_JS) : $(JS_OP_FILES)
	ls -tr $^ | perl -n $(MINIFY_SCRIPT) > $@

index.html : $(INDEX_PATH)
	perl $(REPLACE_SCRIPT_TAGS) $(INDEX_PATH) $(MINIFIED_APP_JS) $(JS_SRC_FILES) > $@

$(PY_PROD_PATH) :
	mkdir -p $(PY_PROD_PATH)

$(PY_PROD_UI_PATH) :
	mkdir -p $(PY_PROD_UI_PATH)

$(PY_PROD_UI_LIB_PATH) :
	mkdir -p $(PY_PROD_UI_LIB_PATH)

build : build-python build-static build-static-lib
.PHONY : build

build-python : $(wildcard src/python/*) | $(PY_PROD_PATH)
	cp $^ $(PY_PROD_PATH)
.PHONY : build-python

build-static-lib : $(JS_SRC_LIB_FILES) | $(PY_PROD_UI_LIB_PATH)
	cp $^ $(PY_PROD_UI_LIB_PATH)/
.PHONY : build-static-lib

build-static : build-static-js build-static-css build-static-index
.PHONY : build-static

build-static-index : index.html | $(PY_PROD_UI_PATH)
	cp $^ $(PY_PROD_UI_PATH)
.PHONY : build-static-index

build-static-js : $(MINIFIED_APP_JS) | $(PY_PROD_UI_PATH)
	cp $^ $(PY_PROD_UI_PATH)
.PHONY : build-static-js

build-static-css : $(CSS_OP_FILES) | $(PY_PROD_UI_PATH)
	cp $^ $(PY_PROD_UI_PATH)
.PHONY : build-static-css

DEPLOY_CMD = appcfg.py
DEPLOY_CMD_FLAGS = update

deploy : build
	$(DEPLOY_CMD) $(DEPLOY_CMD_FLAGS) $(PY_PROD_PATH)
	rm *.js *.css index.html
.PHONY : deploy

clean : 
	rm *.js *.css index.html
.PHONY : clean
