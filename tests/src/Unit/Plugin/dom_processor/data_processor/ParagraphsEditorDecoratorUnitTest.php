<?php

namespace Drupal\Tests\paragraphs_editor\Unit\Plugin\dom_processor\data_processor;

use Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorDecorator;
use Drupal\Tests\dom_processor\Traits\DomProcessorTestTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockFieldValueManagerTrait;
use Drupal\Tests\UnitTestCase;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorDecorator
 * @group paragraphs_editor
 */
class ParagraphsEditorDecoratorUnitTest extends UnitTestCase {
  use MockFieldValueManagerTrait;
  use DomProcessorTestTrait;

  public function testProcess() {
    $field_value_manager = $this->createFieldValueManager([
      'elements' => [
        'widget' => [
          'tag' => 'widget',
          'attributes' => [
            'data-context' => '<context>',
          ],
          'selector' => 'widget',
        ],
      ],
    ]);
    $processor = new ParagraphsEditorDecorator($field_value_manager);
    $data = $this->createDomProcessorData('<widget></widget>', 'widget', [
      'context_id' => 'test_context',
    ]);
    $result = $this->createDomProcessorResult();
    $processor->process($data, $result);
    $this->assertEquals('test_context', $data->node()->getAttribute('data-context'));
  }

}
