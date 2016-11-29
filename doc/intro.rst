Introduction
==============================================================

If you're looking to get up and running with the CKEditor integration, skip to
the paragraphs_ckeditor section.

What are some use cases for this module?
----------------------------------------------

* I want to give content authors a simple WYSIWYG with a library of components
  (paragraphs) to embed in the document.
* I want my content to be translatable and revisionable.
* I like the structure of paragraphs but need the flexability of a free-flowing
  editor.
* I like using the entity embed module, but I want something that provides a
  more in-context experience.

How does this module solve these use cases?
----------------------------------------------

Paragraphs Editor aims to provide structure on the back end (data modeling),
with freedom on the front end (use the tools that make sense). To achieve this
paragraphs are used to store discrete chunks of content that make up a field.
The first item in an editor enabled paragraphs field is always a text paragraph
item that contains the free-flowing markup that will be rendered. Subsequent
field items are paragraph items that have been embedded in the main text
paragraph item.

From a back end perspective, this looks like a normal paragraph field, which is
just a list of referenced entities. From an editor or viewer perspective, it
looks like a fully baked HTML document.

What does this module provide Out-of-the-box?
----------------------------------------------

The Paragraphs Editor module mainly consists of an API that developers can use
to enable paragraphs integration for arbitrary text editors. It also provides
the requisite core Drupal plugins for editing and displaying paragraph fields
as HTML content.

* A field widget plugin that wraps the paragraph field in a text editor.
* A field formatter plugin that renders the paragraph field as an HTML
  document.
* A text filter that converts paragraph embed codes into rendered paragaph
  entities.

The paragraphs_ckeditor module is an adapter that provides ckeditor
integration with the CKEditor implementation in Drupal Core.

What APIs does this module expose?
----------------------------------------------

* An adapter layer for integrating with other editors.
* A plugin layer for implementing different mechanisms for selecting paragraph
  bundles.
* A plugin layer for implementing different behaviors for displaying paragraphs
  editor forms.
