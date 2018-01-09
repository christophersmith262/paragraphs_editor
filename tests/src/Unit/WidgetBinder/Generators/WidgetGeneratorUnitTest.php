<?php

namespace Drupal\Tests\paragraphs_editor\Unit\WidgetBinder\Generators;

use Drupal\Core\Field\FieldConfigInterface;
use Drupal\Core\Render\RenderContext;
use Drupal\paragraphs_editor\WidgetBinder\Generators\WidgetGenerator;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;
use Drupal\Tests\paragraphs_editor\Traits\MockContextTrait;
use Drupal\Tests\UnitTestCase;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\WidgetBinder\Generators\WidgetGenerator
 * @group paragraphs_editor
 */
class WidgetGeneratorUnitTest extends UnitTestCase {
  use MockContextTrait;

  /**
   * @dataProvider mapProvider
   */
  public function testComplete(array $original_edits, array $entity_map, array $editable_contexts, array $calls, array $expected_edits) {
    $context = $this->createContext([ 'context_id' => 'item_context' ]);
    $context->addAdditionalContext('widgetId', 'widget1');
    $context->addAdditionalContext('edits', $original_edits);
    $context->addAdditionalContext('editableContexts', $editable_contexts);
    $context->addAdditionalContext('entityMap', $entity_map);
    $context->addAdditionalContext('editorContext', 'editor_context');
    $item = $context->getEditBuffer()->createItem($this->createMockParagraph([
      'id' => 1,
      'uuid' => 'uuid1',
    ]));

    $data = new WidgetBinderData();

    foreach ($calls as $call) {
      $data->addModel('context', $call[2], [
        'ownerId' => $call[0],
        'fieldId' => $call[1],
      ]);
    }

    $state = new WidgetBinderDataCompilerState([], $data, $context, $item);
    $render_context = new RenderContext();
    $generator = new WidgetGenerator();
    $generator->complete($data, $state, $render_context, 'test_markup');

    $this->assertEquals([
      'widget1' => [
        'contextId' => 'item_context',
        'editorContextId' => 'editor_context',
        'itemContextId' => 'item_context',
        'itemId' => 'uuid1',
        'duplicating' => false,
        'edits' => $expected_edits,
      ],
    ], $data->getModels('widget'));
  }

  public function mapProvider() {
    return [
      [ [], [], [], [], [] ],
      [
        [ 'context1' => 'test1', 'context2' => 'test2' ],
        [ 'uuid1' => 'uuid3', 'uuid2' => 'uuid4' ],
        [
          'uuid1' => [
            'field_test1' => 'context1',
          ],
          'uuid2' => [
            'field_test2' => 'context2',
          ],
        ],
        [ ['uuid3', 'field_test1', 'context3'], ['uuid4', 'field_test2', 'context4'] ],
        [ 'context3' => 'test1', 'context4' => 'test2' ]
      ],
    ];
  }
}
