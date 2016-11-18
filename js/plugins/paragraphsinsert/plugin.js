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
      if (!Drupal.behaviors.paragraphs_ckeditor) {
        return;
      }

      var widgetManager = $(editor.element.$).paragraphsCKEditor('widget-manager');

      // If no widget manager could be found for this instance then this isn't a
      // CKEditor instance we can attach to. In this case, we just don't add any
      // options to the editor.
      if (widgetManager) {

        // Initialize the widget manager for use with this editor.
        widgetManager.initialize(editor);

        // Provide a command for creating an "insert paragraph" dialog.
        editor.addCommand('paragraphsinsert', {
          allowedContent: 'paragraphs-ckeditor-paragraph[data-paragraph-uuid,data-context-hint]',
          requiredContent: 'paragraphs-ckeditor-paragraph[data-paragraph-uuid,data-context-hint]',
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
          allowedContent: 'paragraphs-ckeditor-paragraph[data-paragraph-uuid,data-context-hint]',
          requiredContent: 'paragraphs-ckeditor-paragraph[data-paragraph-uuid,data-context-hint]',
          upcast: function (element) {
            if (element.name == 'paragraphs-ckeditor-paragraph') {
              return element;
            }
            return false;
          },
          downcast: function (element) {
            element.setHtml('');
            return element;
          },
          init: function() {
            var widgetModel = widgetManager.ingest(this);

            // Add a garbage collection handler so that the model / view are
            // destroyed when the widget is destroyed.
            this.on('destroy', function(evt) {
              widgetManager.destroy(widgetModel, true);
            });
          }
        });
      }
    }
  });

})(jQuery, Drupal, CKEDITOR);
