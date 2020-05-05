//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

class Context: ObservableObject {
    @Published var responding:Bool = false
    @Published var loggedIn:Bool = false
    @Published var profile:Profile? = nil

    func fetch() {
        let url = URL(string: "http://127.0.0.1:3000/user")!

        URLSession.shared.dataTask(with: url) {(data, response, error) in
            if let todoData = data {
                DispatchQueue.main.async {
                    self.responding = true
                    self.loggedIn = true
                }

                do {
                    let decodedData = try JSONDecoder().decode(User.self, from: todoData)
                    DispatchQueue.main.async {
                        self.profile = decodedData.profile
                        self.loggedIn = true
                    }
                } catch {
                    print("Error loading user")
                }
            }
        }.resume()
    }
}

struct Index: View {
    @ObservedObject var context = Context()
    @State var timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        Group {
            if (context.responding) {
                if (context.loggedIn) {
                    Wall()
                } else {
                    NavigationView {
                        NavigationLink(destination: Login()) {
                            Text("Login")
                        }
                        .navigationBarTitle(Text("Index"))
                    }
                }
            } else {
                Text("Waiting for server")
            }
        }
        .onReceive(self.timer) { (_) in
            if (!self.context.responding) {
                self.context.fetch()
            }
        }
    }
}

struct Index_Previews: PreviewProvider {
    static var previews: some View {
        Index()
    }
}

