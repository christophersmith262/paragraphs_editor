/**
 * @file
 * Provides Drupal API integrations for paragraphs_editor.
 */

var _ = require('underscore'),
  Drupal = require('drupal'),
  drupalSettings = require('drupal-settings'),
  $ = require('jquery'),
  WidgetBindingProtocol = require('./WidgetBindingProtocol');
  WidgetBinder = require('widget-binder');

require('./BundleSelector');

/**
 * {@namespace}
 */
Drupal.paragraphs_editor = {};

/**
 * Command to process response data from paragraphs editor commands.
 *
 * @param {Drupal.Ajax} [ajax]
 *   {@link Drupal.Ajax} object created by {@link Drupal.ajax}.
 * @param {object} response
 *   The response from the Ajax request.
 * @param {string} response.id
 *   The model id for the command that was used.
 */
Drupal.AjaxCommands.prototype.paragraphs_editor_data = function(ajax, response, status){
  var module_name = response.module;
  delete response.module;
  Drupal.paragraphs_editor.instances[module_name].getSyncActionResolver().resolve(response);
}

/**
 * Theme function for generating paragraphs editor widgets.
 *
 * @return {string}
 *   A string representing a DOM fragment.
 */
Drupal.theme.paragraphsEditorWidget = function(elementFactory, markup, actions) {
  _.each(actions, function(def, id) {
    def.title = Drupal.t(def.title);
  });
  return WidgetBinder.defaults.views['editor'].options.template(elementFactory, markup, actions);
}

/**
 * Theme function for generating paragraphs editor widgets.
 *
 * @return {string}
 *   A string representing a DOM fragment.
 */
Drupal.theme.paragraphsEditorExport = function(elementFactory, fields, edits) {
  return WidgetBinder.defaults.views['export'].options.template(elementFactory, fields, edits);
}

Drupal.paragraphs_editor.instances = {};

Drupal.paragraphs_editor.register = function(module_name, adapter) {
  var config = WidgetBinder.config();

  config.plugins = {
    adapter: adapter,
    protocol: new WidgetBindingProtocol(module_name),
  };

  config.elements.widget = {
    tag: 'paragraph',
    attributes: {
      'data-uuid': '<uuid>',
      'data-context-hint': '<context>',
      'data-viewmode': '<viewmode>',
    },
    selector: 'paragraph[data-context-hint]'
  };

  config.elements.field = {
    tag: 'paragraph-field',
    attributes: {
      'data-field-name': '<name>',
      'data-context': '<context>',
      'data-mutable': '<editable>',
    },
    selector: 'paragraph-field[data-mutable="true"],.editable-paragraph-field',
  };

  config.views['editor'].options.template = Drupal.theme.paragraphsEditorWidget;
  config.views['export'].options.template = Drupal.theme.paragraphsEditorExport;

  config.data = drupalSettings.paragraphs_editor;

  return this.instances[module_name] = new WidgetBinder(config);
}

Drupal.paragraphs_editor.WidgetBinder = WidgetBinder;
