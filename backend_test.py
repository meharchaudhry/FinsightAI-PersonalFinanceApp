#!/usr/bin/env python3

import requests
import sys
import json
import base64
from datetime import datetime
from pathlib import Path

class ReceiptFinanceAPITester:
    def __init__(self, base_url="https://bill-analyzer-25.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, passed, details=""):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
        
        result = {
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"\n{status} - {test_name}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        # Merge with provided headers
        if headers:
            default_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                if isinstance(data, dict):
                    response = requests.post(url, json=data, headers=default_headers, timeout=30)
                else:
                    response = requests.post(url, data=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (expected {expected_status})"
                try:
                    error_detail = response.json().get('detail', response.text[:200])
                    details += f", Error: {error_detail}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_result(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return response.text
            else:
                return None

        except requests.exceptions.Timeout:
            self.log_result(name, False, "Request timeout (30s)")
            return None
        except Exception as e:
            self.log_result(name, False, f"Request failed: {str(e)}")
            return None

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION FLOW")
        print("="*50)
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_user_{timestamp}@example.com"
        test_password = "TestPass123!"
        test_name = f"Test User {timestamp}"
        
        # Test registration
        register_data = {
            "email": test_email,
            "password": test_password,
            "name": test_name
        }
        
        response = self.run_test(
            "User Registration",
            "POST",
            "auth/register", 
            200,
            register_data
        )
        
        if response and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   ✓ Registered user: {test_email}")
            print(f"   ✓ Token received: {self.token[:20]}...")
        else:
            print("   ❌ Registration failed - stopping auth tests")
            return False

        # Test login with same credentials
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            login_data
        )
        
        if response and 'token' in response:
            # Update token from login
            self.token = response['token']
            print(f"   ✓ Login successful with token: {self.token[:20]}...")
        
        # Test get current user
        response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if response:
            print(f"   ✓ User details: {response['name']} ({response['email']})")
        
        return True

    def create_sample_receipt_image(self):
        """Create a simple base64 encoded test receipt image"""
        # Create a minimal 100x100 white PNG for testing
        import io
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # Create a simple receipt-like image
            img = Image.new('RGB', (400, 600), color='white')
            draw = ImageDraw.Draw(img)
            
            # Add receipt content
            draw.text((20, 20), "GROCERY STORE", fill='black')
            draw.text((20, 50), "123 Main St", fill='black')
            draw.text((20, 80), "Date: 2025-01-15", fill='black')
            draw.text((20, 120), "Items:", fill='black')
            draw.text((20, 150), "Milk         $3.99", fill='black')
            draw.text((20, 180), "Bread        $2.50", fill='black')
            draw.text((20, 210), "Eggs         $4.25", fill='black')
            draw.text((20, 250), "Subtotal:   $10.74", fill='black')
            draw.text((20, 280), "GST:         $1.07", fill='black')
            draw.text((20, 320), "TOTAL:      $11.81", fill='black')
            
            # Save to bytes
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes = img_bytes.getvalue()
            
            return base64.b64encode(img_bytes).decode('utf-8')
            
        except ImportError:
            # If PIL not available, create minimal test data
            # Create a minimal PNG header for a 1x1 white pixel
            png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
            return base64.b64encode(png_data).decode('utf-8')

    def test_receipt_operations(self):
        """Test receipt upload, retrieval, and deletion"""
        print("\n" + "="*50)
        print("TESTING RECEIPT OPERATIONS")
        print("="*50)
        
        if not self.token:
            print("❌ No auth token - skipping receipt tests")
            return False

        # Create test image
        test_image = self.create_sample_receipt_image()
        
        # Test receipt upload using multipart form data
        print("\n🔍 Testing Receipt Upload...")
        
        # Create form data
        import io
        image_data = base64.b64decode(test_image)
        
        files = {
            'file': ('test_receipt.png', io.BytesIO(image_data), 'image/png')
        }
        
        headers = {'Authorization': f'Bearer {self.token}'}
        # Don't set Content-Type for multipart
        
        try:
            response = requests.post(
                f"{self.api_base}/receipts/upload",
                files=files,
                headers=headers,
                timeout=60  # Extended timeout for AI processing
            )
            
            if response.status_code == 200:
                receipt_data = response.json()
                self.receipt_id = receipt_data.get('id')
                self.log_result("Receipt Upload", True, f"Receipt ID: {self.receipt_id}")
                print(f"   ✓ Vendor: {receipt_data.get('vendor', 'N/A')}")
                print(f"   ✓ Total: ${receipt_data.get('total', 0):.2f}")
                print(f"   ✓ Category: {receipt_data.get('category', 'N/A')}")
            else:
                error_msg = response.text[:200]
                self.log_result("Receipt Upload", False, f"Status {response.status_code}: {error_msg}")
                return False
                
        except Exception as e:
            self.log_result("Receipt Upload", False, f"Upload failed: {str(e)}")
            return False

        # Test get all receipts
        response = self.run_test(
            "Get All Receipts",
            "GET",
            "receipts",
            200
        )
        
        if response:
            print(f"   ✓ Found {len(response)} receipt(s)")

        # Test get specific receipt
        if hasattr(self, 'receipt_id') and self.receipt_id:
            response = self.run_test(
                "Get Specific Receipt",
                "GET",
                f"receipts/{self.receipt_id}",
                200
            )
            
            if response:
                print(f"   ✓ Receipt details: {response['vendor']} - ${response['total']:.2f}")

        return True

    def test_analytics(self):
        """Test analytics endpoints"""
        print("\n" + "="*50) 
        print("TESTING ANALYTICS")
        print("="*50)
        
        if not self.token:
            print("❌ No auth token - skipping analytics tests")
            return False

        # Test analytics summary
        response = self.run_test(
            "Analytics Summary",
            "GET",
            "analytics/summary",
            200
        )
        
        if response:
            print(f"   ✓ Total spent: ${response.get('total_spent', 0):.2f}")
            print(f"   ✓ Total receipts: {response.get('total_receipts', 0)}")
            print(f"   ✓ Categories: {list(response.get('categories', {}).keys())}")

        return True

    def test_chat_operations(self):
        """Test chat and goals functionality"""
        print("\n" + "="*50)
        print("TESTING CHAT & GOALS")
        print("="*50)
        
        if not self.token:
            print("❌ No auth token - skipping chat tests")
            return False

        # Test create goal
        goal_data = {
            "goal": "Save $1000 for emergency fund",
            "target_amount": 1000.0
        }
        
        response = self.run_test(
            "Create Financial Goal",
            "POST",
            "goals",
            200,
            goal_data
        )
        
        if response:
            self.goal_id = response.get('id')
            print(f"   ✓ Goal created: {response['goal']}")

        # Test get goals
        response = self.run_test(
            "Get Goals",
            "GET",
            "goals",
            200
        )
        
        if response:
            print(f"   ✓ Found {len(response)} goal(s)")

        # Test chat message
        chat_data = {
            "message": "How much have I spent so far?"
        }
        
        print("\n🔍 Testing Chat (may take a few seconds for AI response)...")
        response = self.run_test(
            "Send Chat Message",
            "POST", 
            "chat",
            200,
            chat_data
        )
        
        if response:
            print(f"   ✓ AI Response: {response['response'][:100]}...")

        # Test get chat history
        response = self.run_test(
            "Get Chat History",
            "GET",
            "chat/history", 
            200
        )
        
        if response:
            print(f"   ✓ Chat history: {len(response)} message(s)")

        return True

    def test_deletion_operations(self):
        """Test delete operations"""
        print("\n" + "="*50)
        print("TESTING DELETION OPERATIONS")
        print("="*50)
        
        # Delete goal if created
        if hasattr(self, 'goal_id') and self.goal_id:
            self.run_test(
                "Delete Goal",
                "DELETE",
                f"goals/{self.goal_id}",
                200
            )

        # Delete receipt if created
        if hasattr(self, 'receipt_id') and self.receipt_id:
            self.run_test(
                "Delete Receipt",
                "DELETE", 
                f"receipts/{self.receipt_id}",
                200
            )

        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['passed']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED!")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    print("Starting Receipt Finance API Testing...")
    print("Backend URL: https://bill-analyzer-25.preview.emergentagent.com")
    
    tester = ReceiptFinanceAPITester()
    
    try:
        # Run all test suites
        auth_success = tester.test_auth_flow()
        if auth_success:
            tester.test_receipt_operations()
            tester.test_analytics()
            tester.test_chat_operations()
            tester.test_deletion_operations()
        
        # Print summary
        all_passed = tester.print_summary()
        
        # Save results to file
        results_file = "/app/backend_test_results.json"
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": tester.tests_run,
                    "passed": tester.tests_passed,
                    "failed": tester.tests_run - tester.tests_passed,
                    "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
                },
                "results": tester.test_results,
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"\nTest results saved to: {results_file}")
        
        return 0 if all_passed else 1
        
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())