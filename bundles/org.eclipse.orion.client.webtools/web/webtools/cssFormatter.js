/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd */
define("webtools/cssFormatter", [
'orion/objects',
'orion/Deferred',
'beautifier/beautifier'
], function(Objects, Deferred, Beautifier) {
	var config = {
		// 0:off, 1:warning, 2:error
		/*
		 *     The options are (default in brackets):
        indent_size (4)                         - indentation size,
        indent_char (space)                     - character to indent with,
        selector_separator_newline (true)       - separate selectors with newline or
                                                  not (e.g. "a,\nbr" or "a, br")
        end_with_newline (false)                - end with a newline
        newline_between_rules (true)            - add a new line after every css rule
        space_around_selector_separator (false) - ensure space around selector separators:
                                                  '>', '+', '~' (e.g. "a>b" -> "a > b")
		 * 
		 */
		defaults: {
			"indent_size": 4,
			"indent_char": " ",
			"eol": "\n",
			"end_with_newline": false,
			"newline_between_rules" : true,
			"space_around_selector_separator" : false
		},
		
		setOption: function(ruleId, value, key) {
			if(Array.isArray(this.rules[ruleId])) {
				var ruleConfig = this.rules[ruleId];
				if (key) {
					ruleConfig[1] = ruleConfig[1] || {};
					ruleConfig[1][key] = value;
				} else {
					ruleConfig[0] = value;
				}
			}
			else {
				this.rules[ruleId] = value;
			}
		},
		
		/**
		 * @description Resets the rules to their default values
		 * @function
		 */
		setDefaults: function setDefaults() {
			this.rules = Object.create(null);
			var keys = Object.keys(this.defaults);
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				this.rules[key] = this.defaults[key];
			}
		}
	};

	/**
	 * @name javascript.CssFormatter
	 * @description creates a new instance of the javascript formatter
	 * @constructor
	 * @public
	 * @param {Worker} ternWorker
	 */
	function CssFormatter() {
		config.setDefaults();
	}
	
	Objects.mixin(CssFormatter.prototype, /** @lends javascript.CssFormatter.prototype*/ {
		
		/**
		 * @description Callback from the editor to format the source code
		 * @function
		 * @public 
		 * @memberof javascript.CssFormatter.prototype
		 * @param {orion.edit.EditorContext} editorContext The current editor context
		 * @param {Object} context The current selection context
		 */
		format: function(editorContext, context) {
			var deferred = new Deferred();
			this._format(editorContext, deferred, config.rules);
			return deferred;
		},
	
		/**
		 * @description Format the given editor
		 * @function
		 * @private
		 * @param {orion.edit.EditorContext} editorContext The given editor context
		 * @param {Deferred} deferred the given deferred object
		 * @param {Object} configuration the given configuration
		 * @since 6.0
		 */
		_format: function(editorContext, deferred, configuration) {
			return editorContext.getSelection().then(function(selection) {
				var start = selection.start;
				var end = selection.end;
				if (end !== start) {
					return editorContext.getText(start, end).then(function(text) {
						var formatted = Beautifier.css_beautify(text, configuration);
						if (formatted) {
							deferred.resolve(editorContext.setText(formatted.text, start, end));
						} else {
							deferred.reject();
						}
						return deferred;
					}.bind(this));
				}
				return editorContext.getText().then(function(text) {
					var formatted = Beautifier.css_beautify(text, configuration);
					if (formatted) {
						deferred.resolve(editorContext.setText(formatted));
					} else {
						deferred.reject();
					}
					return deferred;
				}.bind(this));
			}.bind(this));
		},
		
		/**
		 * @description Callback from orion.cm.managedservice
		 * @function
		 * @public
		 * @param {Object} properties The properties that have been changed
		 */
		updated: function(properties) {
			if (!properties) {
				return;
			}
			var oldconfig = properties.pid === 'jsbeautify.config.css';
			var keys = Object.keys(properties);
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var originalKey = key;
				/*
				 * Do the key mapping for common options between css, js and html formatters
				 */
				key = key.replace(/^css_/, "");
				var ruleId = key;
				if(oldconfig && config.rules[key] !== config.defaults[key]) {
					//don't overwrite a new setting with an old one
					continue;
				}
				config.setOption(ruleId, properties[originalKey]);
			}
		},
	});
	
	return {
		CssFormatter: CssFormatter
	};
});