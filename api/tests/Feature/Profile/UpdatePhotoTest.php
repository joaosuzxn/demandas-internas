<?php

namespace Tests\Feature\Profile;

use App\Models\User;
use App\Rules\Base64Image;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ImageFixtures;
use Tests\TestCase;

class UpdatePhotoTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_updates_own_photo(): void
    {
        $user = User::factory()->create();
        $photo = ImageFixtures::dataUri('image/png', ImageFixtures::png());
        $this->actingAs($user);

        $this->fromSpa()->putJson('/api/me/photo', ['photo' => $photo])
            ->assertOk()
            ->assertJsonPath('data.photo', $photo);

        $this->assertSame($photo, $user->fresh()->photo);
    }

    public function test_user_removes_photo_with_null(): void
    {
        $user = User::factory()->create(['photo' => ImageFixtures::dataUri('image/png', ImageFixtures::png())]);
        $this->actingAs($user);

        $this->fromSpa()->putJson('/api/me/photo', ['photo' => null])
            ->assertOk()
            ->assertJsonPath('data.photo', null);

        $this->assertNull($user->fresh()->photo);
    }

    public function test_photo_field_must_be_sent(): void
    {
        $this->actingAs(User::factory()->create());

        $this->fromSpa()->putJson('/api/me/photo', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo']);
    }

    public function test_rejects_photo_over_the_size_limit(): void
    {
        $this->actingAs(User::factory()->create());
        $bytes = ImageFixtures::padTo(ImageFixtures::png(), Base64Image::MAX_BYTES + 1);

        $this->fromSpa()->putJson('/api/me/photo', ['photo' => ImageFixtures::dataUri('image/png', $bytes)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo' => 'A foto não pode ter mais de 512 KB.']);
    }

    public function test_rejects_gif(): void
    {
        $this->actingAs(User::factory()->create());

        $this->fromSpa()->putJson('/api/me/photo', ['photo' => ImageFixtures::dataUri('image/gif', ImageFixtures::gif())])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo']);
    }

    public function test_inactive_user_cannot_update_photo(): void
    {
        $this->actingAs(User::factory()->inactive()->create());

        $this->fromSpa()->putJson('/api/me/photo', ['photo' => null])->assertUnauthorized();
    }

    public function test_requires_authentication(): void
    {
        $this->fromSpa()->putJson('/api/me/photo', ['photo' => null])->assertUnauthorized();
    }
}
