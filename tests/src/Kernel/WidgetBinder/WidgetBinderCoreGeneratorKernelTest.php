<?php

namespace Drupal\Tests\paragraphs_editor\Kernel\WidgetBinder;

/**
 * Integration tests the Widget Binder data compiler with the core generators.
 * @group paragraphs_editor
 */
class WidgetBinderCoreGeneratorKernelTest extends WidgetBinderDataCompilerKernelTest {

  static protected $modules = [
    'system',
    'user',
    'entity_reference_revisions',
    'paragraphs',
    'field',
    'text',
    'node',
    'editor_assets',
    'dom_processor',
    'paragraphs_editor',
    'paragraphs_editor_test'
  ];

  public function testCompile() {
    $compiler = $this->container->get('paragraphs_editor.widget_binder.data_compiler');
    $context_factory = $this->container->get('paragraphs_editor.command.context_factory');
  }
}
