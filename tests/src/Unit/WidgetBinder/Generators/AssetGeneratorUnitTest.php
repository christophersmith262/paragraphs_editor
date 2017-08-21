<?php

namespace Drupal\Tests\paragraphs_editor\Unit\WidgetBinder\Generators;

use Drupal\Core\Render\BubbleableMetadata;
use Drupal\Core\Render\RenderContext;
use Drupal\editor_assets\EditorAssetProcessorInterface;
use Drupal\paragraphs_editor\WidgetBinder\Generators\AssetGenerator;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;
use Drupal\Tests\paragraphs_editor\Traits\MockContextTrait;
use Drupal\Tests\UnitTestCase;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\WidgetBinder\Generators\AssetGenerator
 * @group paragraphs_editor
 */
class AssetGeneratorUnitTest extends UnitTestCase {
  use MockContextTrait;

  public function testComplete() {
    $prophecy = $this->prophesize(EditorAssetProcessorInterface::CLASS);
    $prophecy->processAttachments(['input_attachment'])->willReturn([
      'test_asset_id' => [
        'test_model_key' => 'test_model_value',
      ],
    ]);

    $context = $this->createContext([
      'context_id' => 'test_editor_context',
    ]);
    $context->addAdditionalContext('editorContext', 'test_owner_context');
    $item = $context->getEditBuffer()->createItem($this->createMockParagraph());

    $render_context = new RenderContext();
    $metadata = new BubbleableMetadata();
    $metadata->addAttachments(['input_attachment']);
    $render_context->push($metadata);

    $data = new WidgetBinderData();
    $state = new WidgetBinderDataCompilerState([], $data, $context, $item);
    $generator = new AssetGenerator($prophecy->reveal());
    $generator->complete($data, $state, $render_context, '');

    $this->assertEquals([
      'test_asset_id' => [
        'test_model_key' => 'test_model_value',
        'editorContextId' => 'test_owner_context',
      ],
    ], $data->getModels('asset'));
  }

}
