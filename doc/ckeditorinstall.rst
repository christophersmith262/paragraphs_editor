Paragraphs CKEditor Quickstart
==============================================================

The `paragraphs_ckeditor` module provides a default editor integration for
`paragraphs_editor`. It includes sane defaults for a fresh install.

Getting the Code
----------------------------------------------

You will first want to `cd` to your Drupal custom modules folder:

.. code-block:: none

  cd modules/custom

or if you do not have a custom modules folder:

.. code-block:: none

  cd modules

These paths are relative to your Drupal docroot.

Next we'll need to obtain copies of the `paragraphs_editor` and `paragraphs_ckeditor` modules:

.. code-block:: none

  git clone git@github.com:christophersmith262/paragraphs_editor.git
  git clone git@github.com:christophersmith262/paragraphs_ckeditor.git

Enabling the Module
----------------------------------------------

If you have `drush` you can simply execute:

.. code-block:: none

  drush pm-enable -y paragraphs_ckeditor

This should automatically resolve the additional dependencies and install them.

If you do not have `drush` handy, you will need to also download the following
modules and place them in the same folder as `paragraphs_editor` and
`paragraphs_ckeditor`:

* paragraphs
* entity_reference_revisions

After these modules have been downloaded, you can enable the
`paragraphs_ckeditor` module from the Drupal extensions screen as shown below:

Creating an Editor-Enabled Field
----------------------------------------------

Creating a sample Paragraph Type
----------------------------------------------

Test Driving the New Field
----------------------------------------------
