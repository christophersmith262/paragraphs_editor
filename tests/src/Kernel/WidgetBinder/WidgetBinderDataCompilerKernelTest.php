<?php

namespace Drupal\Tests\paragraphs_editor\Kernel\WidgetBinder;

use Drupal\KernelTests\KernelTestBase;
use Drupal\paragraphs_editor\WidgetBinder\GeneratorInterface;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompiler;
use Drupal\Tests\paragraphs_editor\Traits\MockContextTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockFieldValueManagerTrait;
use Drupal\Tests\paragraphs_editor\Traits\TestContentGenerationTrait;
use Prophecy\Argument;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompiler
 * @group paragraphs_editor
 */
class WidgetBinderDataCompilerKernelTest extends KernelTestBase {
  use MockContextTrait;
  use MockFieldValueManagerTrait;
  use TestContentGenerationTrait;

  static public $modules = [
    'system',
    'user',
    'entity_reference_revisions',
    'paragraphs',
    'field',
    'text',
    'node',
    'paragraphs_editor_test'
  ];

  protected $strictConfigSchema = FALSE;

  public function setUp() {
    parent::setUp();
    $this->installEntitySchema('user');
    $this->installEntitySchema('node');
    $this->installEntitySchema('paragraph');
    $this->installConfig('field');
    $this->installConfig('text');
    $this->installConfig('node');
    $this->installConfig('paragraphs_editor_test');
  }

  public function testCompile() {
    $storage = $this->container->get('entity_type.manager')->getStorage('paragraph');
    $paragraph = $this->generateTabs($storage);
    $context = $this->createContext();
    $buffer_item = $context->getEditBuffer()->createItem($paragraph);

    $compiler = $this->createCompiler();
    $paragraph = $buffer_item->getEntity();

    $prophecy = $this->prophesize(GeneratorInterface::CLASS);
    $prophecy->id()->willReturn('mock');

    $initialized_on = NULL;
    $prophecy->initialize(Argument::cetera())->will(function($args) use (&$initialized_on) {
      $initialized_on = $args[2]->uuid();
    })->shouldBeCalledTimes(1);

    $actual_paragraph_map = $expected_paragraph_map = [];
    $this->topDownParagraphs($paragraph, $expected_paragraph_map);
    $prophecy->processParagraph(Argument::cetera())->will(function($args) use (&$actual_paragraph_map) {
      $actual_paragraph_map[] = $args[2]->uuid();
    })->shouldBeCalledTimes(count($expected_paragraph_map));
    $prophecy->postprocessParagraph(Argument::cetera())->shouldBeCalledTimes(count($expected_paragraph_map));

    $expected_field_map = [
      [$expected_paragraph_map[0], 'field_tabs', FALSE],
      [$expected_paragraph_map[1], 'field_content', TRUE],
    ];
    $actual_field_map = [];
    $prophecy->processField(Argument::cetera())->will(function($args) use (&$actual_field_map) {
      $actual_field_map[] = [
        $args[2]->getEntity()->uuid(),
        $args[2]->getName(),
        $args[3],
      ];
    })->shouldBeCalledTimes(count($expected_field_map));
    $prophecy->postprocessField(Argument::cetera())->shouldBeCalledTimes(count($expected_field_map));

    $actual_markup = NULL;
    $prophecy->complete(Argument::cetera())->will(function ($args) use(&$actual_markup) {
      $actual_markup = $args[3];
    })->shouldBeCalledTimes(1);

    $compiler->addGenerator($prophecy->reveal($paragraph));
    $compiler->compile($context, $buffer_item);

    $this->assertEquals($paragraph->uuid(), $initialized_on);
    $this->assertEquals($expected_paragraph_map, $actual_paragraph_map);
    $this->assertEquals($expected_field_map, $actual_field_map);

    $view = $this->container->get('entity_type.manager')->getViewBuilder('paragraph')->view($paragraph);
    $expected_markup = $this->container->get('renderer')->renderRoot($view);
    $this->assertEquals($expected_markup, $actual_markup);
  }

  protected function createCompiler() {
    return new WidgetBinderDataCompiler(
      $this->container->get('entity_type.manager'),
      $this->container->get('renderer'),
      $this->createFieldValueManager()
    );
  }

  protected function topDownParagraphs($paragraph, array &$call_map) {
    $call_map[] = $paragraph->uuid();
    if ($paragraph->field_tabs) {
      foreach ($paragraph->field_tabs->referencedEntities() as $paragraph) {
        $call_map[] = $paragraph->uuid();
      }
    }
  }
}
