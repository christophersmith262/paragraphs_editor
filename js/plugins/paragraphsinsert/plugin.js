/**
 * @file
 * Drupal Image plugin.
 *
 * This alters the existing CKEditor image2 widget plugin to:
 * - require a data-entity-type and a data-entity-uuid attribute (which Drupal
 *   uses to track where images are being used)
 * - use a Drupal-native dialog (that is in fact just an alterable Drupal form
 *   like any other) instead of CKEditor's own dialogs.
 *
 * @see \Drupal\editor\Form\EditorImageDialog
 *
 * @ignore
 */
(function ($, Drupal, CKEDITOR) {

  'use strict';

  CKEDITOR.plugins.add('paragraphsinsert', {
    icons: 'paragraphsinsert',
    hidpi: false,
    requires: [ "widget" ],
    beforeInit: function(editor) {
      // We need to register the paragraphs-ckeditor-paragraph element with the
      // CKEDITOR DOM model or it will get confused and add wayward <p> tags.
      // Here we will register the paragraphs-ckeditor-paragraph tag to behave
      // like a div tag.
      CKEDITOR.dtd['paragraphs-ckeditor-paragraph'] = CKEDITOR.dtd.div;
      for (var tagName in CKEDITOR.dtd) {
        if (CKEDITOR.dtd[tagName].div) {
          CKEDITOR.dtd[tagName]['paragraphs-ckeditor-paragraph'] = 1;
        }
      }
      CKEDITOR.dtd.body['paragraphs-ckeditor-paragraph'] = 1;
    },
    init: function (editor) {
      var widgetManager = $(editor.element.$).paragraphsCKEditor('widget-manager');

      // If no widget manager could be found for this instance then this isn't a
      // CKEditor instance we can attach to. In this case, we just don't add any
      // options to the editor.
      if (widgetManager) {
        var commandFilter = new Drupal.paragraphs_ckeditor.CKEditorCommandFilter(['paragraphs-ckeditor-paragraph']);

        // Initialize the widget manager for use with this editor.
        widgetManager.initialize(editor);

        // Don't allow commands that would alter the internal paragraph
        // structure to be applied to DOM tree branches that contain
        // paragraphs-ckeditor-paragraph elements.
        editor.on('beforeCommandExec', function(e) {
          commandFilter.apply(e, editor.getSelection());
        });

        // Hide contents of the paragraphs-ckeditor-paragraph tag in source view
        // mode.
        editor.on('toDataFormat', function(e) {
          var node = e.data.dataValue;
          var i;
          var filter = new CKEDITOR.htmlParser.filter({
            elements: {
              "paragraphs-ckeditor-paragraph": function(element) {
                for (i in element.children) {
                  var child = element.children[i];
                  child.remove();
                }
              }
            }
          });
          node.filterChildren(filter);
        }, null, null, 14);

        // Provide a command for creating an "insert paragraph" dialog.
        editor.addCommand('paragraphsinsert', {
          allowedContent: 'paragraphs-ckeditor-paragraph[*]',
          requiredContent: 'paragraphs-ckeditor-paragraph[*]',
          exec: function() {
            widgetManager.insert();
          },
        });

        // Provide the ui component for the "insert paragraph" command.
        editor.ui.addButton('ParagraphsInsert', {
          label: Drupal.t('Insert ' + widgetManager.getSetting('title')),
          command: 'paragraphsinsert',
        });

        // Define the CKEditor widget that represents a paragraph in the editor.
        editor.widgets.add('ParagraphsCKEditorWidget', {
          allowedContent: true,
          requiredContent: 'paragraphs-ckeditor-paragraph[*]',
          template: '<paragraphs-ckeditor-paragraph></paragraphs-ckeditor-paragraph>',
          upcast: function (element) {
            return element.name == 'paragraphs-ckeditor-paragraph';
          },
          init: function() {
            var model = widgetManager.ingest(this);

            // Add a garbage collection handler so that the view is destroyed
            // when the widget is destroyed.
            // 
            this.on('destroy', function(evt) {
              widgetManager.destroy(model);
            });
          }
        });
      }
    }
  });

})(jQuery, Drupal, CKEDITOR);
