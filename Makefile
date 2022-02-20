## Usage
#
#   $ make all        # compile files that need compiling
#   $ make clean all  # remove target files and compile from scratch
#

## Variables
BIN=node_modules/.bin
BUILD=build
BUILD_DEPS=$(BUILD)/deps
BUILD_DEPS_JS=$(BUILD)/dependencies.js
BUILD_ALL_JS=$(BUILD)/all.js
BUILD_ALL_CSS=$(BUILD)/all.css
WEB=web
PUBLIC=public
PUBLIC_ALL_CSS=$(PUBLIC)/css/all.css
PUBLIC_ALL_JS=$(PUBLIC)/js/all.js
SCRIPTS=scripts

# Targets
#
# The format goes:
#
#   target: list of dependencies
#     commands to build target
#
# If something isn't re-compiling double-check the changed file is in the
# target's dependencies list.

# Phony targets - these are for when the target-side of a definition
# (such as "all" below) isn't a file but instead a just label. Declaring
# it as phony ensures that it always run, even if a file by the same name
# exists.
.PHONY: all\
clean\
fonts\
images

all: $(PUBLIC_ALL_CSS)\
$(PUBLIC_ALL_JS)\
fonts\
images

clean:
	# Delete build and output files:
	rm -rf $(BUILD) $(PUBLIC)

fonts:
	mkdir -p $(PUBLIC)/fonts/OpenSans
	cp -r node_modules/open-sans-fontface/fonts/**/* $(PUBLIC)/fonts/OpenSans/

images:
	mkdir -p $(PUBLIC)/images/
	cp -r $(WEB)/images/* $(PUBLIC)/images/

APP_CSS_FILES=$(WEB)/css/fonts.css\
$(WEB)/css/reset.css\
$(WEB)/css/base.css\
$(WEB)/css/responsive.css
$(BUILD_ALL_CSS): $(WEB)/css/*.css
	mkdir -p $$(dirname $@)
	rm -f $(BUILD_ALL_CSS)
	for file in $(APP_CSS_FILES); do \
		echo "/* $$file */" >> $(BUILD_ALL_CSS); \
		cat $$file >> $(BUILD_ALL_CSS); \
		echo "" >> $(BUILD_ALL_CSS); \
	done

$(PUBLIC_ALL_CSS): $(BUILD_ALL_CSS)
	mkdir -p $$(dirname $@)
	cp $(BUILD_ALL_CSS) $(PUBLIC_ALL_CSS)

DEPS_JS_FILES=node_modules/qrcode/build/qrcode.js\
node_modules/jquery/dist/jquery.min.js\
node_modules/underscore/underscore-min.js
$(BUILD_DEPS_JS): $(DEPS_JS_FILES)
	rm -f $(BUILD_DEPS_JS)
	for file in $(DEPS_JS_FILES); do \
		echo "/* $$file */" >> $(BUILD_DEPS_JS); \
		cat $$file >> $(BUILD_DEPS_JS); \
		echo "" >> $(BUILD_DEPS_JS); \
	done

APP_JS_FILES=$(WEB)/js/utils.js\
$(WEB)/js/tools.js
JS_FILES=$(BUILD_DEPS_JS) $(APP_JS_FILES)
$(BUILD_ALL_JS): $(BUILD_DEPS_JS) $(WEB)/js/*.js
	rm -f $(BUILD_ALL_JS)
	for file in $(JS_FILES); do \
		echo "/* $$file */" >> $(BUILD_ALL_JS); \
		cat $$file >> $(BUILD_ALL_JS); \
		echo "" >> $(BUILD_ALL_JS); \
	done

$(PUBLIC_ALL_JS): $(BUILD_ALL_JS)
	mkdir -p $$(dirname $@)
	cp $(BUILD_ALL_JS) $(PUBLIC_ALL_JS)
