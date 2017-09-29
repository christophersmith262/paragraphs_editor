<?php

namespace Drupal\Tests\paragraphs_editor\Unit\Plugin\dom_processor\data_processor;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Tests\UnitTestCase;
use Drupal\Tests\dom_processor\Traits\DomProcessorTestTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockContextTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockFieldValueManagerTrait;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueWrapperInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorExtractor;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorExtractor
 * @group paragraphs_editor
 */
class ParagraphsEditorExtractorUnitTest extends UnitTestCase {
  use MockContextTrait;
  use MockFieldValueManagerTrait;
  use DomProcessorTestTrait;

  public function testProcessPassThrough() {
    $field_value_manager = $this->createFieldValueManagerProphecy()->reveal();
    $data = $this->createDomProcessorData('<body><div></div></body>', 'div');
    $result = $this->createDomProcessorResult();
    $processor = new ParagraphsEditorExtractor($field_value_manager);
    $result = $processor->process($data, $result);
    $this->assertInstanceOf(DomProcessorResultInterface::CLASS, $result);
  }

  /**
   * @dataProvider widgetProvider
   */
  public function testProcessWidget($has_wrapper) {
      $uuid = 'uuid1';
      $markup = '<widget data-uuid="uuid1" data-context="context1"><div></div></widget>';

      $field_value_manager = $this->createFieldValueManagerProphecy()->reveal();
      $paragraph = $this->createMockParagraph(['uuid' => $uuid]);

      if ($has_wrapper) {
        $prophecy = $this->prophesize(FieldValueWrapperInterface::CLASS);
        $prophecy->addReferencedEntity($paragraph)->shouldBeCalledTimes(1);
        $wrapper = $prophecy->reveal();
      }
      else {
        $wrapper = NULL;
      }
    
      $processor = new ParagraphsEditorExtractor($field_value_manager);
      $data = $this->createDomProcessorData($markup, 'widget', [
        'paragraph' => [
          'entity' => $paragraph,
        ],
        'field' => [
          'wrapper' => $wrapper,
        ],
      ]);
      $result = $this->createDomProcessorResult();
      $result = $processor->process($data, $result);

      if (!$has_wrapper) {
        $this->assertEquals([$uuid => $paragraph], $result->get('entities'));
      }

      $this->assertEmpty($data->node()->getAttribute('data-context'));
      $this->assertNotEmpty($data->node()->getAttribute('data-uuid'));
      $this->assertFalse($data->node()->hasChildNodes());
  }

  /**
   * @dataProvider fieldProvider
   */
  public function testProcessField($is_root, $has_wrapper, $new_revision, $langcode) {
      $uuid = 'uuid1';
      if ($is_root) {
        $markup = '<body><div></div></body>';
        $selector = 'body';
      }
      else {
        $markup = '<field><div></div></field>';
        $selector = 'field';
      }
      $format = 'test_format';

      $paragraph = $this->createMockParagraph(['uuid' => $uuid]);
      if ($is_root) {
        $entities = [];
      }
      else {
        $entities = [$paragraph];
      }
      $items = $this->prophesize(FieldItemListInterface::CLASS)->reveal();
      $prophecy = $this->createFieldValueManagerProphecy();
      $prophecy->setItems($items, $entities, $new_revision, $langcode)
        ->shouldBeCalledTimes(1);
      $field_value_manager = $prophecy->reveal();

      if ($has_wrapper) {
        $prophecy = $this->prophesize(FieldValueWrapperInterface::CLASS);
        $prophecy->setMarkup('<div></div>')->shouldBeCalledTimes(1);
        $prophecy->setFormat($format)->shouldBeCalledTimes(1);
        $prophecy->getEntities()->willReturn($entities)->shouldBeCalledTimes(1);
        $wrapper = $prophecy->reveal();
      }
      else {
        $wrapper = NULL;
      }

      $processor = new ParagraphsEditorExtractor($field_value_manager);
      $data = $this->createDomProcessorData($markup, $selector, [
        'langcode' => $langcode,
        'filter_format' => $format,
        'owner' => [
          'new_revision' => $new_revision,
        ],
        'field' => [
          'items' => $items,
          'wrapper' => $wrapper,
        ],
      ]);
      if ($is_root) {
        $this->assertEquals('body', $selector);
        $this->assertTrue($data->isRoot());
      }
      $result = $this->createDomProcessorResult($entities ? [
        'entities' => $entities,
      ] : []);
      $result = $processor->process($data, $result);
  }

  public function widgetProvider() {
    return [
      [0],
      [1],
    ];
  }

  public function fieldProvider() {
    $lang = ['en', 'de'];
    $cases = [];
    for ($i = 0; $i <= 1; $i++) {
      for ($j = 0; $j <= 1; $j++) {
        for ($k = 0; $k <= 1; $k++) {
          for ($l = 0; $l <= 1; $l++) {
            $cases[] = [$i, $j, $k, $lang[$l]];
          }
        }
      }
    }
    return $cases;
  }

  protected function createFieldValueManagerProphecy() {
    return $this->createFieldValueManager([
      'elements' => [
        'widget' => [
          'tag' => 'widget',
          'attributes' => [
            'data-context' => '<context>',
            'data-uuid' => '<uuid>',
          ],
          'selector' => 'widget',
        ],
        'field' => [
          'tag' => 'field',
          'attributes' => [
            'data-name' => '<name>',
            'data-editable' => '<editable>',
            'data-context' => '<context>',
          ],
          'selector' => 'field',
        ],
      ],
    ], TRUE);
  }
}
